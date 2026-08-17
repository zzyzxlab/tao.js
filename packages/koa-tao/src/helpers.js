/**
 * Shared helpers and structural typedefs for the `@tao.js/koa` middleware
 * factories. Koa is **not** a dependency: the `ctx`/`next` parameters are
 * typed structurally ({@link KoaContextLike}, {@link KoaNext}) with exactly
 * the members this package uses, so any conformant context works.
 *
 * @module @tao.js/koa/helpers
 */

/**
 * @typedef {import('@tao.js/core').Trigram} Trigram
 * @typedef {import('@tao.js/core').AppCtx} AppCtx
 * @typedef {import('@tao.js/core').Handler} Handler
 */

/**
 * A trigram matcher whose parts may also be **arrays** of values: the
 * middleware handler registration methods register the given handler for
 * the cartesian product of the parts (e.g.
 * `{ t: ['User', 'Account'], a: 'View' }` registers for `{User,View}` and
 * `{Account,View}`). Short and long keys are both accepted (long-form keys
 * win); nullish parts are dropped (wildcards).
 *
 * @typedef {Object} TrigramSets
 * @property {(string|string[])} [t] - term (short key)
 * @property {(string|string[])} [term] - term (long key)
 * @property {(string|string[])} [a] - action (short key)
 * @property {(string|string[])} [action] - action (long key)
 * @property {(string|string[])} [o] - orient (short key)
 * @property {(string|string[])} [orient] - orient (long key)
 */

/**
 * A long-form trigram as normalized by {@link normalizeAC}: short keys
 * folded into the long ones (long-form keys win); parts may still be
 * arrays and may be `undefined` until {@link cleanInput} drops them.
 *
 * @typedef {Object} LongTrigram
 * @property {(string|string[])} [term]
 * @property {(string|string[])} [action]
 * @property {(string|string[])} [orient]
 */

/**
 * Structural shape of the Koa request this package actually reads.
 *
 * @typedef {Object} KoaRequestLike
 * @property {Object.<string, string>} [headers] - request headers; the
 *           `traceparent` header is read for trace-chain continuation
 * @property {(Object|function(): (Object|Promise<Object>))} [json] - parsed
 *           JSON body, or a (possibly async) accessor for it
 * @property {(Object|function(): (Object|Promise<Object>))} [body] - parsed
 *           request body, or a (possibly async) accessor for it
 */

/**
 * Structural shape of the Koa context this package actually uses. The HTTP
 * middleware reads `path`/`method`/`request` and writes `status`/`body`;
 * the simple and enhanced middleware install (and clear) the
 * request-scoped signalling surface at `ctx.tao`.
 *
 * @typedef {Object} KoaContextLike
 * @property {string} [path] - request path, matched against the middleware's
 *           root (HTTP middleware)
 * @property {string} [method] - HTTP method (HTTP middleware)
 * @property {number} [status] - response status, written by the HTTP
 *           middleware (404/405/400/500)
 * @property {*} [body] - response body, written by the HTTP middleware
 * @property {KoaRequestLike} [request] - the request (headers + body access)
 * @property {(TaoSignaler|null)} [tao] - request-scoped TAO surface
 *           installed by the simple/enhanced middleware while downstream
 *           middleware runs; `null` outside that window
 */

/**
 * Koa's downstream continuation.
 *
 * @callback KoaNext
 * @returns {Promise<*>}
 */

/**
 * The Koa middleware function the factories' `middleware()` methods return.
 *
 * @callback KoaMiddleware
 * @param {KoaContextLike} ctx
 * @param {KoaNext} next
 * @returns {Promise<*>}
 */

/**
 * Signal a trigram + data (short or long keys; long-form keys win) on the
 * request's backing Transponder/Transceiver.
 *
 * @callback TaoSignalerSetCtx
 * @param {Trigram} trigram
 * @param {*} [data] - the signal's datagram(s)
 * @returns {Promise<*>}
 */

/**
 * Signal an already-constructed AppCtx on the request's backing
 * Transponder/Transceiver.
 *
 * @callback TaoSignalerSetAppCtx
 * @param {AppCtx} ac
 * @returns {Promise<*>}
 */

/**
 * The request-scoped signalling surface installed at `ctx.tao` by the
 * simple and enhanced middleware. Both methods signal on the backing
 * Transponder/Transceiver with the request's continued trace chain
 * ({@link chainFromRequest}) and return its settlement Promise — resolving
 * with the first response AppCon handled for the signal (see
 * `@tao.js/utils` `Transponder`/`Transceiver` for timeout semantics).
 *
 * @typedef {Object} TaoSignaler
 * @property {TaoSignalerSetCtx} setCtx
 * @property {TaoSignalerSetAppCtx} setAppCtx
 */

import { TRACE_CHAIN, parseTraceparent } from '@tao.js/telemetry';

/** A shared no-op, used as the default response handler. */
export const noop = () => {};

/**
 * Fold a trigram's short keys into the long ones (long-form keys win).
 * Missing parts stay `undefined` (dropped later by {@link cleanInput}).
 *
 * @param {TrigramSets} trigram - short or long keys; parts may be arrays
 * @returns {LongTrigram} the long-form trigram
 */
export function normalizeAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o,
  };
}

/**
 * Drop nullish parts from a long-form trigram — the remaining parts feed
 * the cartesian product used by the handler registration methods.
 *
 * @param {LongTrigram} trigram
 * @returns {LongTrigram} the same parts minus nullish entries
 */
export const cleanInput = ({ term, action, orient }) => {
  const incoming = { term, action, orient };
  Object.keys(incoming).forEach(
    (k) => incoming[k] == null && delete incoming[k],
  );
  return incoming;
};

/**
 * Continue an inbound W3C `traceparent` header as entry chain state
 * (TAO-SPEC.md §7: request/response transports map the tracing chain
 * key — `taoTrace` — to `traceparent`). Absent or malformed headers yield
 * `null` (a fresh chain). Responses carry no chain in 0.20 — there is no
 * standard W3C response header.
 *
 * @param {KoaContextLike} [ctx] - the request context; only
 *        `ctx.request.headers.traceparent` is read
 * @returns {(Object|null)} entry chain state
 *          `{ taoTrace: { traceId, signalId } }` continuing the remote
 *          trace, or `null`
 */
export function chainFromRequest(ctx) {
  const header =
    ctx && ctx.request && ctx.request.headers
      ? ctx.request.headers.traceparent
      : undefined;
  // parseTraceparent rejects non-strings and malformed headers itself
  const remote = parseTraceparent(header);
  if (!remote) {
    return null;
  }
  return {
    [TRACE_CHAIN]: { traceId: remote.traceId, signalId: remote.parentId },
  };
}
