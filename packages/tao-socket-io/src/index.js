import { AppCtx } from '@tao.js/core';
import {
  Channel,
  createTransport,
  chainFromWire,
  wireEnvelope,
} from '@tao.js/utils';

const DEFAULT_NAMESPACE = 'tao';
const IS_SERVER = typeof window === 'undefined';
const EMIT_EVENT = IS_SERVER ? 0 : 1;
const ON_EVENT = IS_SERVER ? 1 : 0;
const EVENTS = ['fromServer', 'fromClient'];

const NOOP = () => {};

function decorateNetwork(TAO, socket) {
  // duplex transport: every hop is emitted with its wire envelope (chain
  // crosses the boundary — ENVELOPE-SPEC.md §9); arriving signals enter
  // with the transport's hop marker + continued chain
  const transport = createTransport(TAO, {
    send: (tao, data, envelope) =>
      socket.emit(EVENTS[EMIT_EVENT], { tao, data, envelope }),
  });
  socket.on(EVENTS[ON_EVENT], ({ tao, data, envelope }) =>
    transport.receive(tao, data, envelope),
  );
  return transport;
}

function makeAppCtx({ t, term, a, action, o, orient }, data) {
  return new AppCtx(term || t, action || a, orient || o, data);
}

function onEventPlain(TAO, sourceName) {
  return ({ tao, data, envelope }) =>
    TAO.enter(makeAppCtx(tao, data), {
      hop: { source: sourceName },
      chain: chainFromWire(envelope),
    });
}

function onEventAuth(TAO, auth, authTransform, sourceName) {
  return async ({ tao, data, envelope }) => {
    const useData = await authTransform(tao, data, auth);
    TAO.enter(makeAppCtx(tao, useData), {
      hop: { source: sourceName },
      chain: chainFromWire(envelope),
    });
  };
}

function decorateSocket(TAO, socket, authTransform) {
  const { auth } = socket.handshake;
  // §9: the receiving side stamps its own hop-scope origin marker so any
  // phase-blind transport decoration on the same kernel suppresses the
  // arriving hop (the channel-scoped reply path below is structurally
  // immune either way — entries are never mirrored)
  const sourceName = `socket:${socket.id}`;
  if (typeof authTransform === 'function') {
    socket.on(
      EVENTS[ON_EVENT],
      onEventAuth(TAO, auth, authTransform, sourceName),
    );
  } else {
    socket.on(EVENTS[ON_EVENT], onEventPlain(TAO, sourceName));
  }

  // per-client reply path: a veto-respecting emitter on the client Channel's
  // private network — intercept-halted/-diverted signals stay suppressed
  // (ENVELOPE-SPEC.md §10 invariant 5) and the emitted signal carries its
  // chain across the boundary
  const undecorate = TAO.decorate({
    // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
    name: `socket:${socket.id}`,
    onProceed: (ac, envelope) =>
      socket.emit(EVENTS[EMIT_EVENT], {
        tao: ac.unwrapCtx(),
        data: ac.data,
        envelope: wireEnvelope(envelope),
      }),
  });
  socket.on('disconnect', () => {
    undecorate();
  });
}

// change, options object now instead of just onConnect
const ioMiddleware =
  (TAO, { onConnect, authTransform } = {}) =>
  (socket, next) => {
    let clientTAO = new Channel(TAO, socket.id);
    let onDisconnect = NOOP;
    decorateSocket(clientTAO, socket, authTransform);
    if (onConnect && typeof onConnect === 'function') {
      // change: pass the whole socket to onConnect
      onDisconnect = onConnect(clientTAO, socket);
      onDisconnect = typeof onDisconnect === 'function' ? onDisconnect : NOOP;
    }
    socket.on('disconnect', (reason) => {
      onDisconnect(reason);
      clientTAO = null;
      onDisconnect = null;
    });

    if (next && typeof next === 'function') {
      return next();
    }
  };

export default function wireTaoJsToSocketIO(TAO, io, opts = {}) {
  const ns = opts.namespace || opts.ns || DEFAULT_NAMESPACE;
  if (!IS_SERVER) {
    if (io && typeof io === 'function') {
      const host = opts.host || '';
      const socket = io(`${host}/${ns}`, opts.io);
      decorateNetwork(TAO, socket);
      return socket;
    }
  } else {
    const { onConnect, authTransform } = opts;
    if (io && typeof io.of === 'function') {
      const namespacedEngine = io.of(`/${ns}`);
      namespacedEngine.use(ioMiddleware(TAO, { onConnect, authTransform }));
    } else {
      return ioMiddleware(TAO, { onConnect, authTransform });
    }
  }
}
