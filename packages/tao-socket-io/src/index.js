/**
 * @tao.js/socket.io — wire a TAO signal network to socket.io on either side
 * of the connection.
 *
 * One factory, {@link wireTaoJsToSocketIO}, adapts to its environment
 * (detected by `typeof window` at module load):
 *
 * - in the **browser** it connects a socket.io client and bridges it to the
 *   kernel as a duplex transport,
 * - on the **server** it attaches per-connection middleware that scopes each
 *   client to its own `Channel` with a per-client reply path.
 *
 * socket.io itself is **not** a dependency: the `io` and socket parameters
 * are typed structurally ({@link SocketIoClientFactory},
 * {@link SocketIoServerLike}, {@link SocketLike}) with exactly the members
 * this package uses, so any conformant implementation works.
 *
 * Both directions speak the 0.20 wire contract (ENVELOPE-SPEC.md §9): a
 * signal crosses the socket as `{ tao, data, envelope: { v, chain } }` —
 * only the envelope's `chain` scope is portable — and the receiving side
 * re-enters it stamping its own hop-scope `source` marker for echo
 * suppression, continuing the received chain through its local reducers.
 *
 * @module @tao.js/socket.io
 */

/**
 * @typedef {import('@tao.js/core').Trigram} Trigram
 * @typedef {import('@tao.js/utils').NetworkSurface} NetworkSurface
 * @typedef {import('@tao.js/utils').WireEnvelope} WireEnvelope
 */

/**
 * The payload framing a TAO signal on the socket (ENVELOPE-SPEC.md §9),
 * emitted as the `'fromClient'` / `'fromServer'` events.
 *
 * @typedef {Object} SocketPayload
 * @property {Trigram} tao - the signal's trigram (short or long keys;
 *           long-form keys win on receipt)
 * @property {*} data - the signal's datagram(s)
 * @property {WireEnvelope} [envelope] - the portable wire envelope
 *           `{ v, chain }`; absent from pre-0.20 senders and then treated as
 *           a fresh (`null`) chain — one-sided backward compatibility
 */

/**
 * Structural shape of the socket.io Socket this package actually uses —
 * client and server sockets both conform.
 *
 * @typedef {Object} SocketLike
 * @property {string} [id] - socket identifier (server side): names the
 *           per-client Channel and the `socket:<id>` origin marker
 * @property {{ auth: * }} [handshake] - connection handshake (server side);
 *           `handshake.auth` is handed to {@link AuthTransform}
 * @property {function(string, SocketPayload): *} emit - emit a TAO event
 *           (`'fromServer'` from the server, `'fromClient'` from the client)
 * @property {function(string, Function): *} on - subscribe to socket events
 *           (`'fromServer'` / `'fromClient'` / `'disconnect'`)
 */

/**
 * A socket.io client factory (the `io` export of `socket.io-client`): called
 * with `` `${host}/${namespace}` `` and the `opts.io` connection options.
 *
 * @callback SocketIoClientFactory
 * @param {string} url - `` `${host}/${namespace}` ``
 * @param {Object} [opts] - connection options, passed through verbatim from
 *        `opts.io`
 * @returns {SocketLike} the connected namespace socket
 */

/**
 * Structural shape of a socket.io Server: only `of(nsp)` is used, to obtain
 * the namespace the connection middleware is attached to.
 *
 * @typedef {Object} SocketIoServerLike
 * @property {function(string): { use: function(SocketIoMiddleware): * }} of -
 *           resolve the `/{namespace}` namespace
 */

/**
 * Per-connection middleware: attached via `namespace.use(...)` when a server
 * is given, or returned from {@link wireTaoJsToSocketIO} for manual
 * attachment.
 *
 * @callback SocketIoMiddleware
 * @param {SocketLike} socket - the connecting client socket
 * @param {function(): *} [next] - socket.io's middleware continuation;
 *        called (and its value returned) when provided
 * @returns {*}
 */

/**
 * Server-side connection hook: receives the per-client Channel and the raw
 * socket. An optional returned function is invoked with the disconnect
 * reason when the client disconnects.
 *
 * @callback OnConnect
 * @param {Channel} clientTAO - the Channel scoping this client's signals
 * @param {SocketLike} socket - the connected socket
 * @returns {(function(string=): void|*)} optional disconnect cleanup
 */

/**
 * Server-side hook transforming inbound data before it enters the network —
 * e.g. stamping the socket's handshake auth onto the datagram.
 *
 * @callback AuthTransform
 * @param {Trigram} tao - the inbound signal's trigram
 * @param {*} data - the inbound datagram(s)
 * @param {*} auth - `socket.handshake.auth`
 * @returns {(Promise<*>|*)} the data to enter (awaited)
 */

/**
 * Options for {@link wireTaoJsToSocketIO}.
 *
 * @typedef {Object} WireOptions
 * @property {string} [namespace='tao'] - socket.io namespace to connect
 *           to / attach on
 * @property {string} [ns] - alias for `namespace` (`namespace` wins)
 * @property {string} [host=''] - client only: host prefix for the connection
 *           url `` `${host}/${namespace}` ``
 * @property {Object} [io] - client only: connection options passed verbatim
 *           to the client factory
 * @property {OnConnect} [onConnect] - server only: per-connection hook
 * @property {AuthTransform} [authTransform] - server only: inbound data
 *           transform
 */

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

/**
 * Client side: bridge the kernel and the socket as a duplex transport
 * (`createTransport` from `@tao.js/utils`).
 *
 * Outbound, every hop on the network is emitted — phase-blind — as
 * `'fromClient'` with its wire envelope (the chain crosses the boundary —
 * ENVELOPE-SPEC.md §9), except hops that arrived from this socket (echo
 * suppression with the bidirectional reflex). Inbound `'fromServer'`
 * payloads go through `transport.receive`, entering the network with the
 * transport's own hop-scope `source` marker and the received chain.
 *
 * @param {NetworkSurface} TAO - the kernel (or bare Network) to bridge
 * @param {SocketLike} socket - the connected client socket
 * @returns {{ name: string, receive: Function, dispose: Function }} the
 *          transport handle
 */
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

/**
 * Build an AppCtx from a wire trigram + datagram(s); long-form keys win.
 *
 * @param {Trigram} trigram - short or long keys
 * @param {*} data - datagram(s)
 * @returns {AppCtx}
 */
function makeAppCtx({ t, term, a, action, o, orient }, data) {
  return new AppCtx(term || t, action || a, orient || o, data);
}

/**
 * Server side: inbound `'fromClient'` handler without an auth transform —
 * enters the payload on the per-client Channel with the socket's origin
 * marker and the continued wire chain (§9).
 *
 * @param {Channel} TAO - the per-client Channel
 * @param {string} sourceName - this socket's origin marker (`socket:<id>`)
 * @returns {function(SocketPayload): void}
 */
function onEventPlain(TAO, sourceName) {
  return ({ tao, data, envelope }) =>
    TAO.enter(makeAppCtx(tao, data), {
      hop: { source: sourceName },
      chain: chainFromWire(envelope),
    });
}

/**
 * Server side: inbound `'fromClient'` handler that awaits
 * `authTransform(tao, data, handshake.auth)` and enters the transformed
 * data — same origin marker + chain continuation as {@link onEventPlain}.
 *
 * @param {Channel} TAO - the per-client Channel
 * @param {*} auth - `socket.handshake.auth`
 * @param {AuthTransform} authTransform
 * @param {string} sourceName - this socket's origin marker (`socket:<id>`)
 * @returns {function(SocketPayload): Promise<void>}
 */
function onEventAuth(TAO, auth, authTransform, sourceName) {
  return async ({ tao, data, envelope }) => {
    const useData = await authTransform(tao, data, auth);
    TAO.enter(makeAppCtx(tao, useData), {
      hop: { source: sourceName },
      chain: chainFromWire(envelope),
    });
  };
}

/**
 * Server side: wire one client socket to its Channel — the inbound entry
 * path (`'fromClient'` → `Channel.enter` with `hop.source` = `socket:<id>`
 * per ENVELOPE-SPEC.md §9) and the per-client reply path (an `onProceed`
 * decoration on the Channel's private network emitting `'fromServer'`).
 * The decoration is disposed on disconnect.
 *
 * @param {Channel} TAO - the per-client Channel
 * @param {SocketLike} socket - the connected socket
 * @param {AuthTransform} [authTransform] - optional inbound data transform
 * @returns {void}
 */
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

/**
 * Server side: build the per-connection middleware. Each connecting socket
 * gets its own `Channel` on the kernel (id = `socket.id`), wired by
 * {@link decorateSocket}; `onConnect` runs with the Channel + socket, and
 * its returned cleanup (when a function) is invoked with the disconnect
 * reason.
 *
 * @param {NetworkSurface} TAO - the kernel the per-client Channels wrap
 * @param {{ onConnect?: OnConnect, authTransform?: AuthTransform }} opts -
 *        always provided by both internal call sites
 * @returns {SocketIoMiddleware}
 */
// change, options object now instead of just onConnect
// (both internal call sites always pass the options object)
const ioMiddleware =
  (TAO, { onConnect, authTransform }) =>
  (socket, next) => {
    let clientTAO = new Channel(TAO, socket.id);
    /** @type {function(string=): void} */
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

/**
 * Wire a TAO signal network to socket.io — the 0.20 wire contract
 * (ENVELOPE-SPEC.md §9) on both sides of the connection. Environment is
 * detected by `typeof window` at module load:
 *
 * **Client** (`window` defined) — `io` must be a socket.io client factory;
 * it is called with `` `${host}/${namespace}` `` and `opts.io`, and the
 * resulting socket is bridged to `TAO` as a duplex transport
 * (`createTransport`): every hop is emitted as `'fromClient'` with
 * `{ tao, data, envelope: { v, chain } }`, and every inbound `'fromServer'`
 * payload re-enters through `transport.receive` — stamping the transport's
 * own hop-scope `source` marker (echo suppression) and continuing the
 * received chain. Returns the connected socket; returns `undefined` when
 * `io` is not a function.
 *
 * **Server** (no `window`) — each connecting socket gets its own `Channel`
 * on `TAO` (id = `socket.id`). Inbound `'fromClient'` payloads enter the
 * Channel with `hop: { source: 'socket:<id>' }` and the wire envelope's
 * continued chain (absent/unknown-version envelopes enter with a fresh
 * chain); replies are emitted per client as `'fromServer'` by an
 * `onProceed` decoration on the Channel — veto-respecting, so
 * intercept-halted/-diverted signals are never emitted — carrying the
 * dispatch envelope's chain as `{ v, chain }`. When `io` exposes `of()`,
 * the middleware is attached to `io.of('/{namespace}')` and `undefined` is
 * returned; otherwise the middleware function is returned for manual
 * attachment.
 *
 * @param {NetworkSurface} TAO - the Kernel (or bare Network) to bridge
 * @param {(SocketIoClientFactory|SocketIoServerLike|null)} [io] - client
 *        factory (browser), server (attach middleware), or `null`/non-server
 *        to get the middleware back (server)
 * @param {WireOptions} [opts]
 * @returns {(SocketLike|SocketIoMiddleware|undefined)}
 */
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
    if (
      io &&
      typeof (/** @type {SocketIoServerLike} */ (io).of) === 'function'
    ) {
      const namespacedEngine = /** @type {SocketIoServerLike} */ (io).of(
        `/${ns}`,
      );
      namespacedEngine.use(ioMiddleware(TAO, { onConnect, authTransform }));
    } else {
      return ioMiddleware(TAO, { onConnect, authTransform });
    }
  }
}
