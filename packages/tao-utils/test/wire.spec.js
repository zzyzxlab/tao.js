import { AppCtx, Kernel, Network, INLINE } from '@tao.js/core';
import { Tracer, InMemorySink } from '@tao.js/telemetry';
import {
  WIRE_VERSION,
  wireEnvelope,
  chainFromWire,
  enterFromWire,
  createTransport,
} from '../src/wire';

const REQUEST = { t: 'wire', a: 'request', o: 'test' };
const REPLY = { t: 'wire', a: 'reply', o: 'test' };
const REQUEST_DATA = {
  wire: { link: 'up' },
  request: { id: 7 },
  test: { suite: 'wire' },
};
const REPLY_DATA = {
  wire: { link: 'up' },
  reply: { id: 7, ok: true },
  test: { suite: 'wire' },
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('WIRE_VERSION', () => {
  it('is wire-envelope version 1', () => {
    expect(WIRE_VERSION).toBe(1);
  });
});

describe('wireEnvelope', () => {
  it('carries only the version and the envelope chain, verbatim', () => {
    const chain = { taoTrace: { traceId: 'trace', signalId: 'signal' } };
    const envelope = {
      cascade: { live: () => {} },
      hop: { source: 'local', via: INLINE },
      chain,
    };

    const wire = wireEnvelope(envelope);

    // exact shape: cascade and hop never cross the boundary
    expect(wire).toEqual({ v: 1, chain });
    expect(wire.v).toBe(WIRE_VERSION);
    // the chain crosses by reference, not a copy
    expect(wire.chain).toBe(chain);
  });

  it('normalizes a missing or empty chain to null', () => {
    expect(wireEnvelope({ cascade: {}, hop: {} })).toEqual({
      v: 1,
      chain: null,
    });
    expect(wireEnvelope({ chain: null })).toEqual({ v: 1, chain: null });
    expect(wireEnvelope(undefined)).toEqual({ v: 1, chain: null });
  });
});

describe('chainFromWire', () => {
  it('returns the received chain verbatim for the current version', () => {
    const chain = { taoTrace: { traceId: 'trace', signalId: 'signal' } };

    expect(chainFromWire({ v: WIRE_VERSION, chain })).toBe(chain);
  });

  it('treats absent, unversioned, or unknown-version wires as null', () => {
    expect(chainFromWire()).toBeNull();
    expect(chainFromWire(null)).toBeNull();
    expect(chainFromWire({ chain: { a: 1 } })).toBeNull();
    expect(chainFromWire({ v: 2, chain: { a: 1 } })).toBeNull();
    expect(chainFromWire({ v: '1', chain: { a: 1 } })).toBeNull();
  });

  it('treats a missing or non-object chain as null', () => {
    expect(chainFromWire({ v: 1 })).toBeNull();
    expect(chainFromWire({ v: 1, chain: null })).toBeNull();
    expect(chainFromWire({ v: 1, chain: 'not-a-chain' })).toBeNull();
    expect(chainFromWire({ v: 1, chain: 42 })).toBeNull();
    expect(chainFromWire({ v: 1, chain: ['not', 'a', 'chain'] })).toBeNull();
    expect(chainFromWire({ v: 1, chain: true })).toBeNull();
  });
});

describe('enterFromWire', () => {
  it('enters a surface exposing enter directly, stamping the origin hop and continuing the chain', () => {
    const surface = { enter: jest.fn() };
    const chain = { taoTrace: { traceId: 'trace', signalId: 'signal' } };

    enterFromWire(surface, REQUEST, REQUEST_DATA, { v: 1, chain }, 'wire-in');

    expect(surface.enter).toHaveBeenCalledTimes(1);
    const [ac, opts] = surface.enter.mock.calls[0];
    expect(ac).toBeInstanceOf(AppCtx);
    expect(ac.unwrapCtx()).toEqual(REQUEST);
    expect(ac.data).toEqual(REQUEST_DATA);
    expect(opts).toEqual({ hop: { source: 'wire-in' }, chain });
    // the continued chain is the received one, not a copy
    expect(opts.chain).toBe(chain);
  });

  it('builds the entered AppCtx from long trigram keys too', () => {
    const surface = { enter: jest.fn() };

    enterFromWire(
      surface,
      { term: 'wire', action: 'request', orient: 'test' },
      REQUEST_DATA,
      { v: 1, chain: {} },
      'wire-in',
    );

    const [ac] = surface.enter.mock.calls[0];
    expect(ac.unwrapCtx()).toEqual(REQUEST);
    expect(ac.data).toEqual(REQUEST_DATA);
  });

  it('treats absent or invalid wire envelopes as a fresh (null) chain', () => {
    const surface = { enter: jest.fn() };

    enterFromWire(surface, REQUEST, REQUEST_DATA, undefined, 'fresh');
    enterFromWire(
      surface,
      REQUEST,
      REQUEST_DATA,
      { v: 99, chain: { x: 1 } },
      'fresh',
    );

    expect(surface.enter.mock.calls[0][1]).toEqual({
      hop: { source: 'fresh' },
      chain: null,
    });
    expect(surface.enter.mock.calls[1][1]).toEqual({
      hop: { source: 'fresh' },
      chain: null,
    });
  });

  it('resolves a Kernel to its underlying network and reaches its handlers', async () => {
    const kernel = new Kernel();
    const received = jest.fn();
    kernel.addInlineHandler(REQUEST, received);

    enterFromWire(
      kernel,
      REQUEST,
      REQUEST_DATA,
      { v: 1, chain: {} },
      'from-remote',
    );
    await tick();

    expect(received).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith(REQUEST, REQUEST_DATA);
  });
});

describe('createTransport', () => {
  it('requires a kernel or network to attach to', () => {
    const kernelError =
      'must provide `kernel` to attach the transport to a network';

    expect(() => createTransport()).toThrow(kernelError);
    expect(() => createTransport(null, { send: jest.fn() })).toThrow(
      kernelError,
    );
    expect(() => createTransport({}, { send: jest.fn() })).toThrow(kernelError);
  });

  it('requires envelope support on the resolved network', () => {
    const envelopeError =
      'createTransport requires a @tao.js/core version with envelope support - upgrade @tao.js/core';

    // a `_network` without enter (pre-envelope core)
    expect(() =>
      createTransport({ _network: {} }, { send: jest.fn() }),
    ).toThrow(envelopeError);
    // a `_network` with decorate but no enter
    expect(() =>
      createTransport({ _network: { decorate() {} } }, { send: jest.fn() }),
    ).toThrow(envelopeError);
    // a `_network` with enter but no decorate
    expect(() =>
      createTransport({ _network: { enter() {} } }, { send: jest.fn() }),
    ).toThrow(envelopeError);
    // an enter-exposing surface without decorate
    expect(() => createTransport({ enter() {} }, { send: jest.fn() })).toThrow(
      envelopeError,
    );
  });

  it('requires a send function', () => {
    const sendError = 'must provide `send` to emit signals to the wire';

    expect(() => createTransport(new Kernel())).toThrow(sendError);
    expect(() => createTransport(new Kernel(), {})).toThrow(sendError);
    expect(() => createTransport(new Kernel(), { send: 'nope' })).toThrow(
      sendError,
    );
  });

  it('uses explicit names exactly and auto-names WIRE<n> otherwise', () => {
    const named = createTransport(new Kernel(), {
      name: 'uplink',
      send: jest.fn(),
    });
    expect(named.name).toBe('uplink');

    const first = createTransport(new Kernel(), { send: jest.fn() });
    const second = createTransport(new Kernel(), { send: jest.fn() });
    expect(first.name).toMatch(/^WIRE\d+$/);
    expect(second.name).toMatch(/^WIRE\d+$/);
    // the instance counter increments per unnamed transport
    expect(Number(second.name.slice(4))).toBe(Number(first.name.slice(4)) + 1);
  });

  it('returns exactly { name, receive, dispose }', () => {
    const transport = createTransport(new Kernel(), {
      name: 'shaped',
      send: jest.fn(),
    });

    expect(Object.keys(transport)).toEqual(['name', 'receive', 'dispose']);
    expect(transport.receive).toEqual(expect.any(Function));
    expect(transport.dispose).toEqual(expect.any(Function));
  });

  it('emits every local dispatch with its wire envelope', async () => {
    const kernel = new Kernel();
    const send = jest.fn();
    createTransport(kernel, { name: 'emitter', send });
    kernel.addInlineHandler(
      REQUEST,
      () => new AppCtx(REPLY.t, REPLY.a, REPLY.o, REPLY_DATA),
    );
    const entered = new AppCtx(REQUEST.t, REQUEST.a, REQUEST.o, REQUEST_DATA);

    kernel.setAppCtx(entered);
    await tick();

    expect(send).toHaveBeenCalledTimes(2);
    const [tao, data, wire] = send.mock.calls[0];
    expect(tao).toEqual(REQUEST);
    // the datagram is emitted by reference, not serialized here
    expect(data).toBe(entered.data);
    // a bare kernel has no chain reducers: the hop's (empty) chain crosses
    expect(wire).toEqual({ v: 1, chain: {} });
    // the chained hop is emitted too
    const [chainedTao, chainedData, chainedWire] = send.mock.calls[1];
    expect(chainedTao).toEqual(REPLY);
    expect(chainedData).toEqual(REPLY_DATA);
    expect(chainedWire).toEqual({ v: 1, chain: {} });
  });

  it('attaches to a raw Network, enters received signals with its origin marker, and does not echo them', () => {
    const network = new Network();
    const dispatches = [];
    network.decorate({
      name: 'hop-probe',
      onDispatch: (ac, envelope) => {
        dispatches.push({ ac, envelope });
      },
    });
    const send = jest.fn();
    const transport = createTransport(network, { name: 'edge', send });

    transport.receive(
      { term: 'wire', action: 'request', orient: 'test' },
      REQUEST_DATA,
      { v: 1, chain: { anything: true } },
    );

    expect(dispatches).toHaveLength(1);
    expect(dispatches[0].ac.unwrapCtx()).toEqual(REQUEST);
    expect(dispatches[0].ac.data).toEqual(REQUEST_DATA);
    expect(dispatches[0].envelope.hop).toEqual({ source: 'edge' });
    // the arriving hop carries this transport's marker: never echoed back
    expect(send).not.toHaveBeenCalled();
  });

  it('continues received chains through the local reducers and re-roots unknown versions', () => {
    const network = new Network();
    const seen = [];
    network.decorate({
      name: 'continuer',
      chain: {
        key: 'hops',
        next: (prev) => ({ count: prev ? prev.count + 1 : 0 }),
      },
      onDispatch: (ac, envelope) => {
        seen.push(envelope.chain);
      },
    });
    const transport = createTransport(network, {
      name: 'continuing',
      send: jest.fn(),
    });

    transport.receive(REQUEST, REQUEST_DATA, {
      v: 1,
      chain: { hops: { count: 4 } },
    });
    transport.receive(REQUEST, REQUEST_DATA, {
      v: 99,
      chain: { hops: { count: 4 } },
    });

    // a current-version wire continues the received chain key...
    expect(seen[0]).toEqual({ hops: { count: 5 } });
    // ...an unknown-version wire is treated as absent and re-roots
    expect(seen[1]).toEqual({ hops: { count: 0 } });
  });

  it('stops emitting after dispose', () => {
    const kernel = new Kernel();
    const send = jest.fn();
    const transport = createTransport(kernel, { name: 'disposable', send });

    kernel.setCtx(REQUEST, REQUEST_DATA);
    expect(send).toHaveBeenCalledTimes(1);

    transport.dispose();
    kernel.setCtx(REQUEST, REQUEST_DATA);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('bridges two kernels back-to-back: delivery, echo suppression, and the bidirectional reflex', async () => {
    const A = new Kernel();
    const B = new Kernel();
    const aSend = jest.fn((tao, data, wire) => toB.receive(tao, data, wire));
    const bSend = jest.fn((tao, data, wire) => toA.receive(tao, data, wire));
    const toA = createTransport(A, { name: 'wire-A', send: aSend });
    const toB = createTransport(B, { name: 'wire-B', send: bSend });

    const aServes = jest.fn();
    const bServes = jest.fn(
      () => new AppCtx(REPLY.t, REPLY.a, REPLY.o, REPLY_DATA),
    );
    const aReplied = jest.fn();
    A.addInlineHandler(REQUEST, aServes);
    B.addInlineHandler(REQUEST, bServes);
    A.addInlineHandler(REPLY, aReplied);

    A.setCtx(REQUEST, REQUEST_DATA);
    await tick();

    // entry on A reached B's handlers across the wire
    expect(bServes).toHaveBeenCalledTimes(1);
    expect(bServes).toHaveBeenCalledWith(REQUEST, REQUEST_DATA);
    // the arriving hop was NOT echoed back to A: A's transport emitted only
    // the original entry, and A's request handler ran exactly once
    expect(aSend).toHaveBeenCalledTimes(1);
    expect(aSend.mock.calls[0][0]).toEqual(REQUEST);
    expect(aServes).toHaveBeenCalledTimes(1);
    // but the handler-chained descendant on B WAS sent back — the
    // bidirectional reflex — and reached A's handlers
    expect(bSend).toHaveBeenCalledTimes(1);
    expect(bSend.mock.calls[0][0]).toEqual(REPLY);
    expect(aReplied).toHaveBeenCalledTimes(1);
    expect(aReplied).toHaveBeenCalledWith(REPLY, REPLY_DATA);
  });

  it('carries ONE trace across an A→B→A crossing with causal links at both boundaries', async () => {
    const A = new Kernel();
    const B = new Kernel();
    const sinkA = new InMemorySink();
    const sinkB = new InMemorySink();
    new Tracer(A, { sinks: [sinkA] });
    new Tracer(B, { sinks: [sinkB] });
    const aSend = jest.fn((tao, data, wire) => toB.receive(tao, data, wire));
    const bSend = jest.fn((tao, data, wire) => toA.receive(tao, data, wire));
    const toA = createTransport(A, { name: 'wire-A', send: aSend });
    const toB = createTransport(B, { name: 'wire-B', send: bSend });
    B.addInlineHandler(
      REQUEST,
      () => new AppCtx(REPLY.t, REPLY.a, REPLY.o, REPLY_DATA),
    );
    A.addInlineHandler(REPLY, jest.fn());

    A.setCtx(REQUEST, REQUEST_DATA);
    await tick();

    // A recorded its entry and the continuation of B's reply; B recorded
    // the arrival and the reply it chained
    expect(sinkA.size).toBe(2);
    expect(sinkB.size).toBe(2);
    const [aEntry, aContinuation] = sinkA.records;
    const [bArrival, bReply] = sinkB.records;
    // ONE traceId across all records on both sinks, four distinct signals
    expect(
      new Set([
        aEntry.traceId,
        aContinuation.traceId,
        bArrival.traceId,
        bReply.traceId,
      ]).size,
    ).toBe(1);
    expect(
      new Set([
        aEntry.signalId,
        aContinuation.signalId,
        bArrival.signalId,
        bReply.signalId,
      ]).size,
    ).toBe(4);
    // A's entry roots the trace
    expect(aEntry.parentId).toBeNull();
    // B's entry is parent-linked to A's emitting hop
    expect(bArrival.parentId).toBe(aEntry.signalId);
    // B's reply descends from the arrival, produced by the inline phase
    expect(bReply.parentId).toBe(bArrival.signalId);
    expect(bReply.via).toBe(INLINE);
    // A's continuation is parent-linked to B's reply hop
    expect(aContinuation.parentId).toBe(bReply.signalId);
  });
});
