/**
 * Behavioral tests: the socket.io wiring against real @tao.js/core,
 * @tao.js/utils, and @tao.js/telemetry — the executable form of the
 * transport-relevant ENVELOPE-SPEC.md contract for this package:
 * §9 (wire envelope / chain continuity) and §10 invariant 5
 * (intercept veto suppresses the reply emit).
 */
function makeSocket(id = 'client-1') {
  const events = {};
  return {
    id,
    handshake: { auth: {} },
    events,
    emit: jest.fn(),
    on: (event, handler) => {
      const previous = events[event];
      events[event] = previous
        ? (...args) => {
            previous(...args);
            return handler(...args);
          }
        : handler;
    },
  };
}

// Loads the wiring plus real core + telemetry inside one isolated module
// registry, so every class (AppCtx in particular) is shared with the code
// under test.
function loadHarness({ browser } = {}) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(global, 'window');
  if (browser) {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {},
    });
  } else {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });
  }

  const harness = {};
  jest.isolateModules(() => {
    harness.wireTaoJsToSocketIO = require('../src').default;
    const core = require('@tao.js/core');
    harness.Kernel = core.Kernel;
    harness.AppCtx = core.AppCtx;
    const telemetry = require('@tao.js/telemetry');
    harness.Tracer = telemetry.Tracer;
    harness.InMemorySink = telemetry.InMemorySink;
  });

  if (windowDescriptor) {
    Object.defineProperty(global, 'window', windowDescriptor);
  } else {
    delete global.window;
  }

  return harness;
}

async function drain(rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

const TRACE_ID = 'a'.repeat(32);
const PARENT_ID = 'b'.repeat(16);

describe('@tao.js/socket.io behavior (real core + utils)', () => {
  describe('server', () => {
    it('emits the reply with {v:1, chain} continuing the inbound chain across the round trip', async () => {
      const { wireTaoJsToSocketIO, Kernel, AppCtx, Tracer, InMemorySink } =
        loadHarness({ browser: false });
      const TAO = new Kernel();
      const sink = new InMemorySink();
      const tracer = new Tracer(TAO, { sinks: [sink] });
      TAO.addInlineHandler(
        { t: 'Ping', a: 'Send', o: 'Client' },
        (tao, data) =>
          new AppCtx('Pong', 'Receive', 'Client', {
            Pong: { n: data.Ping.n + 1 },
          }),
      );

      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO(TAO, null, {});
      middleware(socket, jest.fn());

      socket.events.fromClient({
        tao: { t: 'Ping', a: 'Send', o: 'Client' },
        data: { n: 1 },
        envelope: {
          v: 1,
          chain: { taoTrace: { traceId: TRACE_ID, signalId: PARENT_ID } },
        },
      });
      await drain();

      // the inbound entry continued the wire chain through the local reducers
      const entry = sink.records.find((r) => r.key === 'Ping|Send|Client');
      expect(entry).toBeDefined();
      expect(entry.traceId).toBe(TRACE_ID);
      expect(entry.parentId).toBe(PARENT_ID);
      const reply = sink.records.find((r) => r.key === 'Pong|Receive|Client');
      expect(reply).toBeDefined();
      expect(reply.via).toBe('Inline');
      expect(reply.parentId).toBe(entry.signalId);

      // exactly one emit: the chained reply — the inbound entry hop itself is
      // never echoed back to the client
      expect(socket.emit).toHaveBeenCalledTimes(1);
      const [event, payload] = socket.emit.mock.calls[0];
      expect(event).toBe('fromServer');
      expect(payload.tao).toEqual({ t: 'Pong', a: 'Receive', o: 'Client' });
      expect(payload.data).toEqual({ Pong: { n: 2 } });
      // the wire envelope carries the reply hop's dispatch chain verbatim
      expect(payload.envelope).toEqual({
        v: 1,
        chain: {
          taoTrace: {
            traceId: TRACE_ID,
            signalId: reply.signalId,
            parentId: entry.signalId,
          },
        },
      });

      tracer.dispose();
    });

    it('does not gate the reply emit on MAIN-kernel intercepts (parallel dispatch scopes; parity with 0.19)', async () => {
      // Invariant 5 suppression is scoped to the dispatch where the
      // suppressed handlers run: channel-attached intercepts gate the
      // per-client reply emit; the shared kernel's intercept outcome does
      // not, because mirrors run before the main dispatch by pinned
      // ordering. Verified byte-identical against published 0.19.1 (the
      // wildcard-inline emit era) over a real socket round trip.
      const { wireTaoJsToSocketIO, Kernel, AppCtx } = loadHarness({
        browser: false,
      });
      const TAO = new Kernel();
      TAO.addInlineHandler(
        { t: 'Ping', a: 'Send', o: 'Client' },
        () => new AppCtx('Pong', 'Receive', 'Client', { Pong: { ok: true } }),
      );
      // MAIN-kernel truthy intercept on the reply trigram
      const mainVeto = jest.fn(() => true);
      TAO.addInterceptHandler(
        { t: 'Pong', a: 'Receive', o: 'Client' },
        mainVeto,
      );

      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO(TAO, null, {});
      middleware(socket, jest.fn());

      socket.events.fromClient({
        tao: { t: 'Ping', a: 'Send', o: 'Client' },
        data: {},
      });
      await drain();
      // the main intercept ran (halting MAIN async/inline for the reply)…
      expect(mainVeto).toHaveBeenCalledTimes(1);
      // …but the channel-scoped emit is a parallel dispatch and still fired
      const replyEmits = socket.emit.mock.calls.filter(
        ([, payload]) => payload && payload.tao && payload.tao.t === 'Pong',
      );
      expect(replyEmits).toHaveLength(1);
    });

    it('suppresses the reply emit for an intercept-vetoed signal while a passing signal still emits (invariant 5)', async () => {
      const { wireTaoJsToSocketIO, Kernel, AppCtx } = loadHarness({
        browser: false,
      });
      const TAO = new Kernel();
      TAO.addInlineHandler(
        { t: 'Ping', a: 'Send', o: 'Client' },
        () => new AppCtx('Pong', 'Receive', 'Client', { Pong: { ok: true } }),
      );
      TAO.addInlineHandler(
        { t: 'Marco', a: 'Send', o: 'Client' },
        () => new AppCtx('Polo', 'Receive', 'Client', { Polo: { ok: true } }),
      );

      const socket = makeSocket();
      let clientTAO;
      const middleware = wireTaoJsToSocketIO(TAO, null, {
        onConnect: (channel) => {
          clientTAO = channel;
        },
      });
      middleware(socket, jest.fn());
      expect(clientTAO).toBeDefined();

      // channel-attached intercept veto on the reply trigram
      const veto = jest.fn(() => true);
      clientTAO.addInterceptHandler(
        { t: 'Pong', a: 'Receive', o: 'Client' },
        veto,
      );

      socket.events.fromClient({
        tao: { t: 'Ping', a: 'Send', o: 'Client' },
        data: {},
      });
      await drain();
      // the veto ran and the halted reply was never emitted to the client
      expect(veto).toHaveBeenCalledTimes(1);
      expect(socket.emit).not.toHaveBeenCalled();

      socket.events.fromClient({
        tao: { t: 'Marco', a: 'Send', o: 'Client' },
        data: {},
      });
      await drain();
      // the passing signal's reply still emits
      expect(socket.emit).toHaveBeenCalledTimes(1);
      const [event, payload] = socket.emit.mock.calls[0];
      expect(event).toBe('fromServer');
      expect(payload.tao).toEqual({ t: 'Polo', a: 'Receive', o: 'Client' });
      expect(payload.envelope.v).toBe(1);
    });

    it('dispatches inbound payloads without an envelope property (pre-0.20 client)', async () => {
      const { wireTaoJsToSocketIO, Kernel } = loadHarness({ browser: false });
      const TAO = new Kernel();
      const handled = jest.fn();
      TAO.addInlineHandler({ t: 'Legacy', a: 'Send', o: 'Client' }, handled);

      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO(TAO, null, {});
      middleware(socket, jest.fn());

      socket.events.fromClient({
        tao: { t: 'Legacy', a: 'Send', o: 'Client' },
        data: { ok: 1 },
      });
      await drain();
      expect(handled).toHaveBeenCalledTimes(1);
      expect(handled).toHaveBeenCalledWith(
        { t: 'Legacy', a: 'Send', o: 'Client' },
        { Legacy: { ok: 1 } },
      );
    });
  });

  describe('client', () => {
    it('stamps outbound payloads with the hop chain and continues inbound chains through the kernel', async () => {
      const { wireTaoJsToSocketIO, Kernel, Tracer, InMemorySink } = loadHarness(
        { browser: true },
      );
      const TAO = new Kernel();
      const sink = new InMemorySink();
      const tracer = new Tracer(TAO, { sinks: [sink] });
      const socket = makeSocket();
      const io = jest.fn(() => socket);

      expect(wireTaoJsToSocketIO(TAO, io, {})).toBe(socket);

      TAO.setCtx({ t: 'User', a: 'View', o: 'App' }, { id: 1 });
      const outRecord = sink.records.find((r) => r.key === 'User|View|App');
      expect(outRecord).toBeDefined();
      // outbound payload carries the dispatch hop's chain as a wire envelope
      expect(socket.emit).toHaveBeenCalledTimes(1);
      const [event, payload] = socket.emit.mock.calls[0];
      expect(event).toBe('fromClient');
      expect(payload.tao).toEqual({ t: 'User', a: 'View', o: 'App' });
      expect(payload.data).toEqual({ User: { id: 1 } });
      expect(payload.envelope).toEqual({
        v: 1,
        chain: {
          taoTrace: {
            traceId: outRecord.traceId,
            signalId: outRecord.signalId,
            parentId: null,
          },
        },
      });

      // inbound 'fromServer' continues the received chain: the local entry's
      // trace record roots in the remote traceId/signalId
      const remote = { traceId: 'c'.repeat(32), signalId: 'd'.repeat(16) };
      socket.events.fromServer({
        tao: { t: 'Server', a: 'Notify', o: 'App' },
        data: { m: 1 },
        envelope: { v: 1, chain: { taoTrace: remote } },
      });
      await drain();
      const inRecord = sink.records.find((r) => r.key === 'Server|Notify|App');
      expect(inRecord).toBeDefined();
      expect(inRecord.traceId).toBe(remote.traceId);
      expect(inRecord.parentId).toBe(remote.signalId);
      // the arriving hop is not echoed back out (source suppression)
      expect(socket.emit).toHaveBeenCalledTimes(1);

      tracer.dispose();
    });
  });
});
