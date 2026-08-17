/**
 * @typedef {import('@tao.js/utils').NetworkSurface} NetworkSurface
 * @typedef {import('@tao.js/core').Handler} Handler
 * @typedef {import('./helpers').TrigramSets} TrigramSets
 * @typedef {import('./helpers').KoaMiddleware} KoaMiddleware
 * @typedef {import('./helpers').TaoSignaler} TaoSignaler
 */

// import { AppCtx } from '@tao.js/core';
import cartesian from 'cartesian';
import { Channel, Transponder } from '@tao.js/utils';
import { noop, normalizeAC, cleanInput, chainFromRequest } from './helpers';

const DEFAULT_CHANNEL_NAME = 'koa-simple-middleware';
const CHANNEL_NAME_TYPE = 'channel';
const TRANSPONDER_NAME_TYPE = 'transponder';
const DEFAULT_TIMEOUT = 3000;

/**
 * Build an id-generator that namespaces generated Channel/Transponder ids
 * as `{name}-{type}-{newId}`.
 *
 * @param {string} type - `'channel'` or `'transponder'`
 * @param {string} name - the configured middleware name
 * @returns {function((string|number)): string}
 */
function getNameId(type, name) {
  return (newId) => {
    return `${name}-${type}-${newId}`;
  };
}

/**
 * Build the request-scoped `ctx.tao` surface over the request's
 * Transponder, threading the request's continued trace chain into every
 * signal.
 *
 * @param {Transponder} transponder - the request's Transponder
 * @param {(Object|null)} chain - entry chain state from
 *        {@link module:@tao.js/koa/helpers~chainFromRequest}
 * @returns {TaoSignaler}
 */
function buildCtxTao(transponder, chain) {
  return {
    setCtx({ t, term, a, action, o, orient }, data) {
      return transponder.setCtx({ t, term, a, action, o, orient }, data, {
        chain,
      });
    },
    setAppCtx(ac) {
      return transponder.setAppCtx(ac, { chain });
    },
  };
}

/**
 * The API returned by {@link simpleMiddleware}: attach the Koa middleware
 * and manage response handlers on the middleware's Channel.
 *
 * @typedef {Object} SimpleMiddlewareApi
 * @property {function(): KoaMiddleware} middleware - build the Koa
 *           middleware: each request gets its own Transponder on the shared
 *           Channel and a `ctx.tao` signalling surface
 *           ({@link TaoSignaler}) whose signals continue the request's
 *           `traceparent` chain; after downstream middleware settles, the
 *           Transponder is detached and `ctx.tao` is reset to `null`
 * @property {function(TrigramSets, Handler=): void} addResponseHandler -
 *           attach an inline handler to the middleware's Channel for every
 *           trigram in the cartesian product of the given parts (defaults
 *           to a no-op handler)
 * @property {function(TrigramSets, Handler=): void} removeResponseHandler -
 *           remove a previously attached handler for the same trigram
 *           parts
 */

/**
 * Use the `simpleMiddleware` to build koa apps that work with your TAO Signal Network on the
 * koa app server.
 *
 * All requests share one `Channel` on the network; each request signals
 * through its own short-lived `Transponder` so `ctx.tao.setCtx(...)` /
 * `ctx.tao.setAppCtx(...)` resolve with the first response AppCon handled
 * for that request's signal. Inbound W3C `traceparent` headers are
 * continued as the entry chain (TAO-SPEC.md §7).
 *
 * @export
 * @param {NetworkSurface} TAO - the Kernel (or other TAO Network surface) to signal on
 * @param {Object} [opt={}]
 * @param {string} [opt.name] - name to prepend to the TAO Channel and Transponder names that will be generated
 * @param {number} [opt.timeout=3000] - timeout in Milliseconds to wait on completing a TAO chain before the Transponder rejects the Promise
 * @param {PromiseConstructor} [opt.promise=Promise] - Promise constructor used to create promises returned by `setCtx` and `setAppCtx`
 * @param {boolean} [opt.debug] - print console.log of internal behavior
 * @returns {SimpleMiddlewareApi} - an Object instantiated to attach a `middleware` to a koa app and add/remove response handlers
 */
export default function simpleMiddleware(TAO, opt = {}) {
  const { debug = false } = opt;
  const namer = getNameId(CHANNEL_NAME_TYPE, opt.name || DEFAULT_CHANNEL_NAME);
  const channel = new Channel(TAO, namer);
  return {
    middleware() {
      return async (ctx, next) => {
        let transponder = new Transponder(
          channel,
          getNameId(TRANSPONDER_NAME_TYPE, opt.name),
          opt.timeout || DEFAULT_TIMEOUT,
          opt.promise,
        );
        ctx.tao = buildCtxTao(transponder, chainFromRequest(ctx));
        // downstream middleware is async in any real koa app — detaching
        // before it settles would strip the resolver while requests are
        // still awaiting their signals
        await next();
        transponder.detach();
        ctx.tao = null;
        transponder = null;
      };
    },
    addResponseHandler({ t, term, a, action, o, orient }, handler = noop) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        debug &&
          console.log('@tao.js/koa::addResponseHandler::trigram:', trigram);
        channel.addInlineHandler(trigram, handler);
      }
    },
    removeResponseHandler({ t, term, a, action, o, orient }, handler = noop) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        channel.removeInlineHandler(trigram, handler);
      }
    },
  };
}
