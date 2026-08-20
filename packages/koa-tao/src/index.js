/**
 * @tao.js/koa — expose a TAO signal network over HTTP via Koa middleware.
 *
 * Three factories, all taking the network surface first:
 *
 * - {@link taoHttpMiddleware} (the default export) — serve the TAO HTTP
 *   surface (`POST /{root}/context`, `GET /{root}/responses`) over a
 *   shared Channel with per-request Transponders.
 * - {@link simpleMiddleware} — install a request-scoped `ctx.tao`
 *   signalling surface backed by a per-request Transponder on a shared
 *   Channel.
 * - {@link enhancedMiddleware} — install `ctx.tao` backed by one
 *   long-lived Transceiver spanning all requests.
 *
 * Koa is **not** a dependency: `ctx`/`next` are typed structurally (see
 * {@link KoaContextLike}) with exactly the members this package uses.
 * All three factories continue an inbound W3C `traceparent` header as the
 * signal's entry chain (TAO-SPEC.md §7).
 *
 * @module @tao.js/koa
 */

/**
 * Shared shapes re-exported for typed consumers (the JSDoc typedefs are the
 * source of truth at their defining modules).
 *
 * @typedef {import('./helpers').KoaContextLike} KoaContextLike
 * @typedef {import('./helpers').KoaRequestLike} KoaRequestLike
 * @typedef {import('./helpers').KoaMiddleware} KoaMiddleware
 * @typedef {import('./helpers').KoaNext} KoaNext
 * @typedef {import('./helpers').TaoSignaler} TaoSignaler
 * @typedef {import('./helpers').TrigramSets} TrigramSets
 * @typedef {import('./tao-http-middleware').TaoHttpMiddlewareApi} TaoHttpMiddlewareApi
 * @typedef {import('./simple-middleware').SimpleMiddlewareApi} SimpleMiddlewareApi
 * @typedef {import('./enhanced-middleware').EnhancedMiddlewareApi} EnhancedMiddlewareApi
 */
import taoHttpMiddleware from './tao-http-middleware';
import simpleMiddleware from './simple-middleware';
import enhancedMiddleware from './enhanced-middleware';

export default taoHttpMiddleware;

export { taoHttpMiddleware, simpleMiddleware, enhancedMiddleware };
