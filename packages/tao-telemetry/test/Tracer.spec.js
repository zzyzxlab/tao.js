import { AppCtx, Kernel } from '@tao.js/core';
import Tracer from '../src/Tracer';
import InMemorySink from '../src/InMemorySink';

const TERM = 'trace';
const ACTION = 'test';
const ORIENT = 'jest';
const NEXT_ACTION = 'chained';
const THIRD_ACTION = 'settled';
const OTHER_ACTION = 'branched';

const TRIGRAM = { t: TERM, a: ACTION, o: ORIENT };
const NEXT_TRIGRAM = { t: TERM, a: NEXT_ACTION, o: ORIENT };

const TRACE_ID_RX = /^[0-9a-f]{32}$/;
const SIGNAL_ID_RX = /^[0-9a-f]{16}$/;

let TAO = null;
let sink = null;
function initTAO() {
  TAO = new Kernel();
  sink = new InMemorySink();
}
function clearTAO() {
  TAO = null;
  sink = null;
}

beforeEach(initTAO);
afterEach(clearTAO);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Tracer exports a class', () => {
  it('should provide a constructor that takes a Kernel as argument', () => {
    // Assemble
    // Act
    // Assert
    expect(Tracer).toBeDefined();
    expect(new Tracer(TAO)).toBeInstanceOf(Tracer);
    expect(new Tracer(new Kernel()._network)).toBeInstanceOf(Tracer);
    // one tracer per network — the chain key is namespaced and exclusive
    expect(() => new Tracer(TAO)).toThrow(/already reduced/);
  });

  it('should throw without a signal network or on a pre-envelope core', () => {
    // Assemble
    const oldCore = { _network: { use: () => {}, setCtxControl: () => {} } };
    // Act
    // Assert
    expect(() => new Tracer()).toThrow(/must provide `kernel`/);
    expect(() => new Tracer(oldCore._network)).toThrow(/envelope support/);
  });

  it('should validate sinks added after construction', () => {
    // Assemble
    const tracer = new Tracer(TAO);
    // Act
    // Assert
    expect(() => tracer.addSink({})).toThrow(/must implement signal/);
    expect(tracer.addSink(new InMemorySink())).toBe(tracer);
  });
});

describe('Tracer records plain kernel signals with full causality — no instrumentation', () => {
  it('should record a root signal with W3C-shaped ids and handler counts', () => {
    // Assemble
    new Tracer(TAO, { sinks: [sink], clock: () => 1234 });
    TAO.addInlineHandler(TRIGRAM, jest.fn());
    // Act
    TAO.setCtx(TRIGRAM, { [TERM]: { id: 1 } });
    // Assert
    expect(sink.size).toBe(1);
    const [record] = sink.records;
    expect(record).toMatchObject({
      t: TERM,
      a: ACTION,
      o: ORIENT,
      key: `${TERM}|${ACTION}|${ORIENT}`,
      parentId: null,
      timestamp: 1234,
      handlers: { intercept: 0, async: 0, inline: 1 },
    });
    expect(record.traceId).toMatch(TRACE_ID_RX);
    expect(record.signalId).toMatch(SIGNAL_ID_RX);
    expect(record.data).toBeUndefined();
  });

  it('should link a multi-hop inline chain across generations', async () => {
    // Assemble
    new Tracer(TAO, { sinks: [sink] });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(
      NEXT_TRIGRAM,
      () => new AppCtx(TERM, THIRD_ACTION, ORIENT),
    );
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(sink.size).toBe(3);
    const [root, child, grandchild] = sink.records;
    expect(child.parentId).toBe(root.signalId);
    expect(grandchild.parentId).toBe(child.signalId);
    expect(grandchild.traceId).toBe(root.traceId);
  });

  it('should keep sibling fan-out as siblings', async () => {
    // Assemble
    new Tracer(TAO, { sinks: [sink] });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, OTHER_ACTION, ORIENT));
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(sink.size).toBe(3);
    const [root, childA, childB] = sink.records;
    expect(childA.parentId).toBe(root.signalId);
    expect(childB.parentId).toBe(root.signalId);
  });

  it('should link async-chained and intercept-redirected AppCons', async () => {
    // Assemble
    new Tracer(TAO, { sinks: [sink] });
    const swallowed = jest.fn();
    TAO.addAsyncHandler(
      TRIGRAM,
      async () => new AppCtx(TERM, NEXT_ACTION, ORIENT),
    );
    TAO.addInterceptHandler(
      NEXT_TRIGRAM,
      () => new AppCtx(TERM, THIRD_ACTION, ORIENT),
    );
    TAO.addInlineHandler(NEXT_TRIGRAM, swallowed);
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    await flush();
    // Assert
    expect(swallowed).not.toHaveBeenCalled();
    expect(sink.size).toBe(3);
    const [root, asyncChild, redirect] = sink.records;
    expect(asyncChild.parentId).toBe(root.signalId);
    expect(redirect.parentId).toBe(asyncChild.signalId);
    expect(redirect.a).toBe(THIRD_ACTION);
  });

  it('should capture data by reference or through a redaction function', () => {
    // Assemble
    const byRef = new InMemorySink();
    new Tracer(TAO, { sinks: [byRef], captureData: true });
    const redactKernel = new Kernel();
    const redacted = new InMemorySink();
    new Tracer(redactKernel, {
      sinks: [redacted],
      captureData: (data, ac) => ({ keys: Object.keys(data), key: ac.key }),
    });
    // Act
    TAO.setCtx(TRIGRAM, { [TERM]: { id: 7 } });
    redactKernel.setCtx(TRIGRAM, { [TERM]: { id: 7 } });
    // Assert
    expect(byRef.records[0].data).toEqual({ [TERM]: { id: 7 } });
    expect(redacted.records[0].data).toEqual({
      keys: [TERM],
      key: `${TERM}|${ACTION}|${ORIENT}`,
    });
  });

  it('should not let a failing sink break dispatch or other sinks', () => {
    // Assemble
    const broken = {
      signal: jest.fn(() => {
        throw new Error('sink boom');
      }),
    };
    new Tracer(TAO, { sinks: [broken, sink] });
    const handler = jest.fn();
    TAO.addInlineHandler(TRIGRAM, handler);
    // Act
    // Assert
    expect(() => TAO.setCtx(TRIGRAM, {})).not.toThrow();
    expect(broken.signal).toHaveBeenCalledTimes(1);
    expect(sink.size).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should stop recording after dispose', () => {
    // Assemble
    const tracer = new Tracer(TAO, { sinks: [sink] });
    // Act
    TAO.setCtx(TRIGRAM, {});
    tracer.dispose();
    TAO.setCtx(TRIGRAM, {});
    // Assert
    expect(sink.size).toBe(1);
  });
});

describe('Tracer continues traces across process boundaries', () => {
  it('should continue a trace from a W3C traceparent header', () => {
    // Assemble
    const tracer = new Tracer(TAO, { sinks: [sink] });
    const remoteTraceId = 'ab'.repeat(16);
    const remoteSignalId = 'cd'.repeat(8);
    // Act
    tracer.setCtx(
      TRIGRAM,
      {},
      { traceparent: `00-${remoteTraceId}-${remoteSignalId}-01` },
    );
    // Assert
    const [record] = sink.records;
    expect(record.traceId).toBe(remoteTraceId);
    expect(record.parentId).toBe(remoteSignalId);
  });

  it('should continue a trace from explicit { traceId, parentId } and reject garbage', () => {
    // Assemble
    const tracer = new Tracer(TAO, { sinks: [sink] });
    const remoteTraceId = 'ef'.repeat(16);
    // Act
    tracer.setCtx(TRIGRAM, {}, { traceId: remoteTraceId, parentId: null });
    tracer.setCtx(TRIGRAM, {}, { traceparent: 'garbage' });
    // Assert
    expect(sink.records[0].traceId).toBe(remoteTraceId);
    expect(sink.records[0].parentId).toBeNull();
    expect(sink.records[1].traceId).toMatch(TRACE_ID_RX);
    expect(sink.records[1].parentId).toBeNull();
  });

  it('should respect the kernel wildcard policy on tracer entries', () => {
    // Assemble
    const tracer = new Tracer(TAO, { sinks: [sink] });
    // Act
    tracer.setCtx({ t: TERM }, {});
    // Assert
    expect(sink.size).toBe(0);
  });
});

describe('Tracer records legacy-mode dispatches as unlinked roots', () => {
  it('should record caller-owned forwarding entries without linkage', async () => {
    // Assemble
    new Tracer(TAO, { sinks: [sink] });
    TAO.addInlineHandler(TRIGRAM, jest.fn());
    // Act — the frozen legacy path: caller owns the forward
    TAO._network.setCtxControl(TRIGRAM, {}, { legacyCaller: true }, () => {});
    await flush();
    // Assert
    expect(sink.size).toBe(1);
    const [record] = sink.records;
    expect(record.parentId).toBeNull();
    expect(record.traceId).toMatch(TRACE_ID_RX);
  });
});
