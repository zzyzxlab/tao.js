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
  via,
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
  if (typeof via !== 'undefined') {
    record.via = via;
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

  it('should append the producing phase to via-stamped records in the tree', () => {
    // Assemble — a two-hop cascade whose child hop was produced inline
    const sink = new InMemorySink();
    sink.signal(mkRecord({ id: 'root', t: 'pong', a: 'enter', o: 'app' }));
    sink.signal(
      mkRecord({
        id: 'child',
        parentId: 'root',
        t: 'pong',
        a: 'run',
        o: 'app',
        via: 'Inline',
      }),
    );
    // Act
    const formatted = sink.format();
    // Assert — the entry line is unchanged; the chained line carries ·<via>
    expect(formatted).toBe(
      ['☯ {pong, enter, app}', '└── ☯ {pong, run, app} ·Inline'].join('\n'),
    );
  });

  it('should place via before data when both are rendered', () => {
    // Assemble
    const sink = new InMemorySink();
    sink.signal(
      mkRecord({
        id: 'root',
        t: 'S',
        a: 'A',
        o: 'O',
        via: 'Async',
        data: { x: 1 },
      }),
    );
    // Act
    // Assert
    expect(sink.format({ showData: true })).toBe('☯ {S, A, O} ·Async {"x":1}');
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

  it('should append the producing phase when a record carries via', () => {
    // Assemble
    const logger = mkLogger();
    const sink = new ConsoleSink({ logger });
    // Act
    sink.signal(mkRecord({ id: 'root', t: 'Space', a: 'Enter', o: 'Portal' }));
    sink.signal(
      mkRecord({
        id: 'child',
        parentId: 'root',
        t: 'Space',
        a: 'List',
        o: 'Portal',
        via: 'Inline',
      }),
    );
    // Assert
    expect(logger.info).toHaveBeenNthCalledWith(1, '☯{Space, Enter, Portal}');
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      '  ↳ ☯{Space, List, Portal} ·Inline',
    );
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

describe('ConsoleSink defaults', () => {
  it('should construct with no options and log via the global console', () => {
    // Assemble
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const sink = new ConsoleSink();
    // Act
    sink.signal(mkRecord({ id: 'default-root' }));
    // Assert
    expect(info).toHaveBeenCalledWith('☯{Term, Act, Or}');
    info.mockRestore();
  });
});

describe('ConsoleSink assertion tightening (mutation)', () => {
  it('should log exactly one line per signal when showData is off', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const sink = new ConsoleSink();
    sink.signal(mkRecord({ id: 'with-data', data: { Term: { id: 1 } } }));
    expect(info).toHaveBeenCalledTimes(1);
    info.mockRestore();
  });

  it('should log exactly one line for data-less records even with showData on', () => {
    const logger = { info: jest.fn() };
    const sink = new ConsoleSink({ logger, showData: true });
    sink.signal(mkRecord({ id: 'no-data' }));
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('should not build depth from an unseen truthy parent', () => {
    const logger = { info: jest.fn() };
    const sink = new ConsoleSink({ logger });
    sink.signal(mkRecord({ id: 'orphan', parentId: 'never-seen' }));
    sink.signal(
      mkRecord({ id: 'child-of-orphan', parentId: 'orphan', a: 'Deep' }),
    );
    // the orphan is depth 0; its child must be depth 1
    expect(logger.info).toHaveBeenNthCalledWith(1, '☯{Term, Act, Or}');
    expect(logger.info).toHaveBeenNthCalledWith(2, '  ↳ ☯{Term, Deep, Or}');
  });

  it('should keep sibling depths without evicting fresh parents', () => {
    const logger = { info: jest.fn() };
    const sink = new ConsoleSink({ logger });
    sink.signal(mkRecord({ id: 'root' }));
    sink.signal(mkRecord({ id: 'sib-a', parentId: 'root', a: 'First' }));
    sink.signal(mkRecord({ id: 'sib-b', parentId: 'root', a: 'Second' }));
    expect(logger.info).toHaveBeenNthCalledWith(2, '  ↳ ☯{Term, First, Or}');
    expect(logger.info).toHaveBeenNthCalledWith(3, '  ↳ ☯{Term, Second, Or}');
  });
});

describe('InMemorySink assertion tightening (mutation)', () => {
  it('should not index parentless records under a null parent', () => {
    const sink = new InMemorySink();
    sink.signal(mkRecord({ id: 'root' }));
    expect(sink.childrenOf(null)).toEqual([]);
    expect(sink.childrenOf(undefined)).toEqual([]);
  });

  it('should omit data from format() by default even when records carry data', () => {
    const sink = new InMemorySink();
    sink.signal(
      mkRecord({
        id: 'root',
        t: 'Space',
        a: 'Enter',
        o: 'Portal',
        data: { x: 1 },
      }),
    );
    expect(sink.format()).toBe('☯ {Space, Enter, Portal}');
  });

  it('should continue last-child subtrees with blank prefixes', () => {
    const sink = new InMemorySink();
    sink.signal(mkRecord({ id: 'root', t: 'S', a: 'A', o: 'O' }));
    sink.signal(
      mkRecord({ id: 'last', parentId: 'root', t: 'S', a: 'B', o: 'O' }),
    );
    sink.signal(
      mkRecord({ id: 'deep', parentId: 'last', t: 'S', a: 'C', o: 'O' }),
    );
    expect(sink.format()).toBe(
      ['☯ {S, A, O}', '└── ☯ {S, B, O}', '    └── ☯ {S, C, O}'].join('\n'),
    );
  });

  it('should survive evicting a record whose parent index was already dropped', () => {
    const sink = new InMemorySink({ limit: 2 });
    sink.signal(mkRecord({ id: 'gp' }));
    sink.signal(mkRecord({ id: 'p', parentId: 'gp' }));
    // evicts gp, which also drops gp's children index
    sink.signal(mkRecord({ id: 'x1' }));
    // evicts p, whose parent index no longer exists
    expect(() => sink.signal(mkRecord({ id: 'x2' }))).not.toThrow();
    expect(sink.size).toBe(2);
    expect(sink.byId('p')).toBeUndefined();
  });
});

describe('format showData with data-less records (mutation)', () => {
  it('should not append anything for records without data even when showData is on', () => {
    const sink = new InMemorySink();
    sink.signal(mkRecord({ id: 'root', t: 'S', a: 'A', o: 'O' }));
    expect(sink.format({ showData: true })).toBe('☯ {S, A, O}');
  });
});
