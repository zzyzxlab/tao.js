/**
 * @typedef {import('@tao.js/utils').NetworkSurface} NetworkSurface
 * @typedef {import('@tao.js/core').Handler} Handler
 * @typedef {import('./helpers').TrigramSets} TrigramSets
 * @typedef {import('./helpers').KoaMiddleware} KoaMiddleware
 * @typedef {import('./helpers').TaoSignaler} TaoSignaler
 */

// import { AppCtx } from '@tao.js/core';
import cartesian from 'cartesian';
import { Transceiver } from '@tao.js/utils';
import { noop, normalizeAC, cleanInput, chainFromRequest } from './helpers';

const DEFAULT_NAME = 'koa-enhanced-middleware';
const TRANSCEIVER_NAME_TYPE = 'transceiver';
const DEFAULT_TIMEOUT = 0;

/**
 * Build an id-generator that namespaces generated Transceiver ids as
 * `{name}-{type}-{newId}`.
 *
 * @param {string} type - `'transceiver'`
 * @param {string} name - the configured middleware name
 * @returns {function((string|number)): string}
 */
function getNameId(type, name) {
  return (newId) => {
    return `${name}-${type}-${newId}`;
  };
}

/**
 * Build the request-scoped `ctx.tao` surface over the shared Transceiver,
 * threading the request's continued trace chain into every signal.
 *
 * @param {Transceiver} transceiver - the middleware's long-lived Transceiver
 * @param {(Object|null)} chain - entry chain state from
 *        {@link module:@tao.js/koa/helpers~chainFromRequest}
 * @returns {TaoSignaler}
 */
function buildCtxTao(transceiver, chain) {
  return {
    setCtx({ t, term, a, action, o, orient }, data) {
      return transceiver.setCtx({ t, term, a, action, o, orient }, data, {
        chain,
      });
    },
    setAppCtx(ac) {
      return transceiver.setAppCtx(ac, { chain });
    },
  };
}

/**
 * The API returned by {@link enhancedMiddleware}: attach the Koa middleware
 * and manage handlers (all three phases) on the middleware's Transceiver.
 *
 * Each `add*`/`remove*` method registers/removes the handler for every
 * trigram in the cartesian product of the given parts.
 *
 * @typedef {Object} EnhancedMiddlewareApi
 * @property {function(): KoaMiddleware} middleware - build the Koa
 *           middleware: installs the `ctx.tao` signalling surface
 *           ({@link TaoSignaler}) over the shared Transceiver, with signals
 *           continuing the request's `traceparent` chain; after downstream
 *           middleware settles, `ctx.tao` is reset to `null` (the
 *           Transceiver itself is long-lived)
 * @property {function(TrigramSets, Handler): void} addInterceptHandler
 * @property {function(TrigramSets, Handler): void} addAsyncHandler
 * @property {function(TrigramSets, Handler): void} addInlineHandler
 * @property {function(TrigramSets, Handler): void} removeInterceptHandler
 * @property {function(TrigramSets, Handler): void} removeAsyncHandler
 * @property {function(TrigramSets, Handler): void} removeInlineHandler
 */

/**
 * Use the `enhancedMiddleware` to build koa apps that work with your TAO Signal Network on the
 * koa app server. Different from the `simpleMiddleware`, the `enhancedMiddleware` utilizes a
 * Transceiver to provide control for how promises are managed within the handlers attached
 * to the TAO Network that the `enhancedMiddleware` wraps (first arg)
 *
 * One long-lived `Transceiver` spans all requests (no per-request Channel);
 * `ctx.tao.setCtx(...)` / `ctx.tao.setAppCtx(...)` resolve per the
 * Transceiver's settlement semantics. Inbound W3C `traceparent` headers are
 * continued as the entry chain (ENVELOPE-SPEC.md §9).
 *
 * @export
 * @param {NetworkSurface} TAO - the Kernel (or other TAO Network surface) to signal on
 * @param {Object} [opt={}]
 * @param {string} [opt.name] - name to prepend to the TAO Transceiver name that will be generated
 * @param {number} [opt.timeout=0] - timeout in Milliseconds to wait on completing a TAO chain before the Transceiver rejects the Promise (`0` = no timeout)
 * @param {PromiseConstructor} [opt.promise=Promise] - Promise constructor used to create promises returned by `setCtx` and `setAppCtx`
 * @returns {EnhancedMiddlewareApi} - an Object instantiated to attach a `middleware` to a koa app and add/remove handlers
 */
export default function enhancedMiddleware(TAO, opt = {}) {
  const namer = getNameId(TRANSCEIVER_NAME_TYPE, opt.name || DEFAULT_NAME);
  const transceiver = new Transceiver(
    TAO,
    namer,
    opt.timeout || DEFAULT_TIMEOUT,
    opt.promise,
  );
  return {
    middleware() {
      return async (ctx, next) => {
        ctx.tao = buildCtxTao(transceiver, chainFromRequest(ctx));
        // downstream middleware is async in any real koa app — clearing
        // ctx.tao before it settles would null the surface while routes
        // are still using it (the transceiver itself is long-lived)
        await next();
        ctx.tao = null;
      };
    },
    addInterceptHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.addInterceptHandler(trigram, handler);
      }
    },
    addAsyncHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.addAsyncHandler(trigram, handler);
      }
    },
    addInlineHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.addInlineHandler(trigram, handler);
      }
    },
    removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.removeInterceptHandler(trigram, handler);
      }
    },
    removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.removeAsyncHandler(trigram, handler);
      }
    },
    removeInlineHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.removeInlineHandler(trigram, handler);
      }
    },
  };
}
