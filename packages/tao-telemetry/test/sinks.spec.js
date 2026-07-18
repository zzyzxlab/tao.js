import InMemorySink from '../src/InMemorySink';
import ConsoleSink from '../src/ConsoleSink';

const TRACE_ID = 'ab'.repeat(16);

let nextId = 0;
function mkRecord({
  id,
  parentId = null,
  t = 'Term',
  a = 'Act',
  o = 'Or',
  data,
}) {
  const record = {
    traceId: TRACE_ID,
    signalId: id || `sig-${++nextId}`,
    parentId,
    t,
    a,
    o,
    key: `${t}|${a}|${o}`,
    timestamp: 1000 + nextId,
    handlers: { intercept: 0, async: 0, inline: 1 },
  };
  if (typeof data !== 'undefined') {
    record.data = data;
  }
  return record;
}

describe('InMemorySink collects signal records', () => {
  it('should store records and index them by signal id', () => {
    // Assemble
    const sink = new InMemorySink();
    const record = mkRecord({ id: 'root' });
    // Act
    sink.signal(record);
    // Assert
    expect(sink.size).toBe(1);
    expect(sink.records).toEqual([record]);
    expect(sink.byId('root')).toBe(record);
  });

  it('should track children of a parent signal', () => {
    // Assemble
    const sink = new InMemorySink();
    const root = mkRecord({ id: 'root' });
    const childA = mkRecord({ id: 'childA', parentId: 'root' });
    const childB = mkRecord({ id: 'childB', parentId: 'root' });
    // Act
    sink.signal(root);
    sink.signal(childA);
    sink.signal(childB);
    // Assert
    expect(sink.childrenOf('root')).toEqual([childA, childB]);
    expect(sink.childrenOf('childA')).toEqual([]);
    expect(sink.roots()).toEqual([root]);
  });

  it('should treat a record with an unseen (remote) parent as a local root', () => {
    // Assemble
    const sink = new InMemorySink();
    const continued = mkRecord({ id: 'local', parentId: 'remote-signal' });
    // Act
    sink.signal(continued);
    // Assert
    expect(sink.roots()).toEqual([continued]);
  });

  it('should reassemble records into causal trees', () => {
    // Assemble
    const sink = new InMemorySink();
    const root = mkRecord({ id: 'root', a: 'Enter' });
    const child = mkRecord({ id: 'child', parentId: 'root', a: 'List' });
    const grandchild = mkRecord({ id: 'gc', parentId: 'child', a: 'View' });
    // Act
    sink.signal(root);
    sink.signal(child);
    sink.signal(grandchild);
    const [tree] = sink.toTree();
    // Assert
    expect(tree.record).toBe(root);
    expect(tree.children[0].record).toBe(child);
    expect(tree.children[0].children[0].record).toBe(grandchild);
  });

  it('should format an ASCII tree of the causal chain', () => {
    // Assemble
    const sink = new InMemorySink();
    sink.signal(mkRecord({ id: 'root', t: 'Space', a: 'Enter', o: 'Portal' }));
    sink.signal(
      mkRecord({
        id: 'a',
        parentId: 'root',
        t: 'Space',
        a: 'List',
        o: 'Portal',
      }),
    );
    sink.signal(
      mkRecord({ id: 'b', parentId: 'a', t: 'Space', a: 'View', o: 'Portal' }),
    );
    sink.signal(
      mkRecord({
        id: 'c',
        parentId: 'root',
        t: 'User',
        a: 'Track',
        o: 'Admin',
      }),
    );
    // Act
    const formatted = sink.format();
    // Assert
    expect(formatted).toBe(
      [
        '☯ {Space, Enter, Portal}',
        '├── ☯ {Space, List, Portal}',
        '│   └── ☯ {Space, View, Portal}',
        '└── ☯ {User, Track, Admin}',
      ].join('\n'),
    );
  });

  it('should include data in the formatted tree when asked', () => {
    // Assemble
    const sink = new InMemorySink();
    sink.signal(mkRecord({ id: 'root', data: { Term: { id: 1 } } }));
    const circular = {};
    circular.self = circular;
    sink.signal(mkRecord({ id: 'child', parentId: 'root', data: circular }));
    // Act
    const formatted = sink.format({ showData: true });
    // Assert
    expect(formatted).toContain('{"Term":{"id":1}}');
    expect(formatted).toContain('[unserializable data]');
  });

  it('should evict oldest records at the limit and keep indexes consistent', () => {
    // Assemble
    const sink = new InMemorySink({ limit: 2 });
    const root = mkRecord({ id: 'root' });
    const child = mkRecord({ id: 'child', parentId: 'root' });
    const grandchild = mkRecord({ id: 'gc', parentId: 'child' });
    // Act
    sink.signal(root);
    sink.signal(child);
    sink.signal(grandchild);
    // Assert
    expect(sink.size).toBe(2);
    expect(sink.byId('root')).toBeUndefined();
    expect(sink.childrenOf('root')).toEqual([]);
    // the evicted root's child now surfaces as a local root
    expect(sink.roots()).toEqual([child]);
    expect(sink.childrenOf('child')).toEqual([grandchild]);
  });

  it('should evict a sibling from a surviving parent index without orphaning the rest', () => {
    // Assemble — children fed before their parent (sinks accept any order)
    const sink = new InMemorySink({ limit: 3 });
    const childA = mkRecord({ id: 'childA', parentId: 'root' });
    const childB = mkRecord({ id: 'childB', parentId: 'root' });
    const root = mkRecord({ id: 'root' });
    // Act
    sink.signal(childA);
    sink.signal(childB);
    sink.signal(root);
    sink.signal(mkRecord({ id: 'later' })); // evicts childA while root survives
    // Assert
    expect(sink.byId('childA')).toBeUndefined();
    expect(sink.childrenOf('root')).toEqual([childB]);
  });

  it('should drop an emptied parent index when its last child is evicted', () => {
    // Assemble
    const sink = new InMemorySink({ limit: 2 });
    const early = mkRecord({ id: 'early', parentId: 'root' });
    const root = mkRecord({ id: 'root' });
    const later = mkRecord({ id: 'later' });
    // Act
    sink.signal(early);
    sink.signal(root);
    sink.signal(later); // evicts early while root survives
    // Assert
    expect(sink.byId('early')).toBeUndefined();
    expect(sink.childrenOf('root')).toEqual([]);
    expect(sink.roots()).toEqual([root, later]);
  });

  it('should clear all records and indexes', () => {
    // Assemble
    const sink = new InMemorySink();
    sink.signal(mkRecord({ id: 'root' }));
    // Act
    sink.clear();
    // Assert
    expect(sink.size).toBe(0);
    expect(sink.records).toEqual([]);
    expect(sink.byId('root')).toBeUndefined();
    expect(sink.format()).toBe('');
  });
});

describe('ConsoleSink streams signals with causal indentation', () => {
  function mkLogger() {
    return { info: jest.fn() };
  }

  it('should log a root signal at depth 0', () => {
    // Assemble
    const logger = mkLogger();
    const sink = new ConsoleSink({ logger });
    // Act
    sink.signal(mkRecord({ id: 'root', t: 'Space', a: 'Enter', o: 'Portal' }));
    // Assert
    expect(logger.info).toHaveBeenCalledWith('☯{Space, Enter, Portal}');
  });

  it('should indent descendants by causal depth', () => {
    // Assemble
    const logger = mkLogger();
    const sink = new ConsoleSink({ logger });
    // Act
    sink.signal(mkRecord({ id: 'root' }));
    sink.signal(mkRecord({ id: 'child', parentId: 'root', a: 'List' }));
    sink.signal(mkRecord({ id: 'gc', parentId: 'child', a: 'View' }));
    // Assert
    expect(logger.info).toHaveBeenNthCalledWith(2, '  ↳ ☯{Term, List, Or}');
    expect(logger.info).toHaveBeenNthCalledWith(3, '    ↳ ☯{Term, View, Or}');
  });

  it('should treat an unseen parent as depth 0', () => {
    // Assemble
    const logger = mkLogger();
    const sink = new ConsoleSink({ logger });
    // Act
    sink.signal(mkRecord({ id: 'x', parentId: 'never-seen' }));
    // Assert
    expect(logger.info).toHaveBeenCalledWith('☯{Term, Act, Or}');
  });

  it('should log data when showData is on', () => {
    // Assemble
    const logger = mkLogger();
    const sink = new ConsoleSink({ logger, showData: true });
    const data = { Term: { id: 1 } };
    // Act
    sink.signal(mkRecord({ id: 'root', data }));
    // Assert
    expect(logger.info).toHaveBeenCalledWith('  ', data);
  });

  it('should cap its depth bookkeeping at the limit', () => {
    // Assemble
    const logger = mkLogger();
    const sink = new ConsoleSink({ logger, limit: 1 });
    // Act
    sink.signal(mkRecord({ id: 'root' }));
    sink.signal(mkRecord({ id: 'child', parentId: 'root' })); // evicts root's depth
    sink.signal(mkRecord({ id: 'gc', parentId: 'root' })); // root no longer known
    // Assert
    expect(logger.info).toHaveBeenNthCalledWith(2, '  ↳ ☯{Term, Act, Or}');
    expect(logger.info).toHaveBeenNthCalledWith(3, '☯{Term, Act, Or}');
  });
});
