/**
 * @typedef {import('@tao.js/utils').NetworkSurface} NetworkSurface
 * @typedef {import('@tao.js/core').Handler} Handler
 * @typedef {import('./helpers').TrigramSets} TrigramSets
 * @typedef {import('./helpers').KoaContextLike} KoaContextLike
 * @typedef {import('./helpers').KoaNext} KoaNext
 * @typedef {import('./helpers').KoaMiddleware} KoaMiddleware
 */

import { AppCtx } from '@tao.js/core';
import cartesian from 'cartesian';
import { Channel, Transponder } from '@tao.js/utils';
import { noop, normalizeAC, cleanInput, chainFromRequest } from './helpers';

// const noop = () => {};

const DEFAULT_ROOT = 'tao';
const ROUTE_POSITION = 1;
const ROUTE_RESPONSES = 'responses';
const ROUTE_CONTEXT = 'context';
const DEFAULT_TIMEOUT = 3000;

/**
 * Resolve the request's body data: the configured `opt.json` field first,
 * then `ctx.request.json`, then `ctx.request.body` — each may be the value
 * itself or a (possibly async) accessor function. Resolves `null` when no
 * source yields data.
 *
 * @param {KoaContextLike} ctx
 * @param {string} [bodyProp] - the configured request field (`opt.json`)
 * @returns {Promise<(Object|null)>} the body — expected `{ tao, data }`
 */
async function getBodyData(ctx, bodyProp) {
  let data = null;
  if (bodyProp && ctx.request[bodyProp]) {
    if (typeof ctx.request[bodyProp] === 'function') {
      data = await ctx.request[bodyProp]();
    } else {
      data = ctx.request[bodyProp];
    }
  }
  if (!data && ctx.request.json) {
    if (typeof ctx.request.json === 'function') {
      data = await ctx.request.json();
    } else {
      data = ctx.request.json;
    }
  }
  if (!data && ctx.request.body) {
    if (typeof ctx.request.body === 'function') {
      data = await ctx.request.body();
    } else {
      data = ctx.request.body;
    }
  }
  return data;
}

/**
 * `GET /{root}/responses` — reply with the trigrams that currently have at
 * least one attached response handler, as
 * `{ responses: [{ t, a, o }, …] }`.
 *
 * @param {Map<string, { ac: AppCtx, count: number }>} responseTrigrams
 * @param {KoaContextLike} ctx
 * @param {KoaNext} next
 * @returns {Promise<*>} `next()`'s result
 */
function handleResponsesRequest(responseTrigrams, ctx, next) {
  // const out = Array.from(responseTrigrams.values());
  ctx.body = {
    // out,
    responses: Array.from(responseTrigrams.values())
      .filter((r) => r.count > 0)
      .map((r) => r.ac.unwrapCtx()),
  };
  return next();
}

/**
 * `POST /{root}/context` — signal the request body's `{ tao, data }` on the
 * per-request Transponder (continuing the request's `traceparent` chain)
 * and reply with the first response AppCon as `{ tao, data }`; a rejected
 * settlement (e.g. Transponder timeout) replies 500.
 *
 * @param {Transponder} transponder - the request's Transponder
 * @param {(string|undefined)} bodyProp - the configured request body field
 *        (`opt.json`)
 * @param {KoaContextLike} ctx
 * @param {KoaNext} next - unused; settlement is awaited here, `next()` runs
 *        in the caller
 * @returns {Promise<void>}
 */
async function handleContext(transponder, bodyProp, ctx, next) {
  // getBodyData resolves to null when no matching body/json/configured field is
  // present on the request; guard so a body-less POST can't crash the process.
  const { tao, data } = (await getBodyData(ctx, bodyProp)) || {};
  try {
    const ac = await transponder.setCtx(tao, data, {
      chain: chainFromRequest(ctx),
    });
    ctx.body = {
      tao: ac.unwrapCtx(),
      data: ac.data,
    };
  } catch (err) {
    console.error('Error:', err);
    ctx.status = 500;
  }
}

/**
 * The API returned by {@link taoMiddleware}: attach the Koa middleware and
 * manage response handlers on the middleware's Channel.
 *
 * @typedef {Object} TaoHttpMiddlewareApi
 * @property {function(): KoaMiddleware} middleware - build the Koa
 *           middleware serving the TAO HTTP surface under `/{root}`:
 *           `POST /{root}/context` signals the body's `{ tao, data }`
 *           through a per-request Transponder — continuing the request's
 *           W3C `traceparent` chain (TAO-SPEC.md §7) — and replies
 *           with the first response AppCon as `{ tao, data }`;
 *           `GET /{root}/responses` lists the trigrams with attached
 *           response handlers. Non-matching paths pass through; wrong
 *           methods get 405, unknown routes 404, extra path segments 400.
 * @property {function(TrigramSets, Handler=): void} addResponseHandler -
 *           attach an inline response handler to the middleware's Channel
 *           for every trigram in the cartesian product of the given parts
 *           (defaults to a no-op handler), and advertise it on
 *           `GET /{root}/responses`
 * @property {function(TrigramSets, Handler=): void} removeResponseHandler -
 *           remove a previously attached handler and decrement its
 *           advertised count
 */

/**
 * Expose a TAO signal network over HTTP: request/response semantics on top
 * of the network via a `Channel` (shared by all requests) + per-request
 * `Transponder`s.
 *
 * @export
 * @param {NetworkSurface} TAO - the Kernel (or other TAO Network surface) to expose
 * @param {Object} [opt={}]
 * @param {string} [opt.root='tao'] - URL root the middleware serves (`/{root}/context`, `/{root}/responses`)
 * @param {string} [opt.name] - name for the middleware's Channel
 * @param {string} [opt.json] - request field holding the parsed body (checked before `request.json` / `request.body`)
 * @param {number} [opt.timeout=3000] - timeout in Milliseconds to wait on completing a TAO chain before the Transponder rejects the Promise
 * @param {PromiseConstructor} [opt.promise=Promise] - Promise constructor used for the per-request settlement promises
 * @param {boolean} [opt.debug] - print console.log of internal behavior
 * @returns {TaoHttpMiddlewareApi} - an Object instantiated to attach a `middleware` to a koa app and add/remove response handlers
 */
export default function taoMiddleware(TAO, opt = {}) {
  /** @type {Map<string, { ac: AppCtx, count: number }>} */
  const responseTrigrams = new Map();
  const { debug = false } = opt;
  const bodyProp = opt.json;
  const rootPath = opt.root || DEFAULT_ROOT;
  const rootTest = new RegExp(`/${rootPath}/([^/]+)/?(.*)?`, 'i');
  const channel = new Channel(TAO, opt.name);
  // const transponder = new Transponder(TAO, opt.name, 3000);
  channel.addInlineHandler(
    {},
    (tao, data) =>
      debug && console.log('taoMiddleware::hitting the first with:', tao, data),
  );

  return {
    middleware() {
      return async (ctx, next) => {
        const path = ctx.path.match(rootTest);
        if (!path) {
          return next();
        }
        const route = path[ROUTE_POSITION];
        if (!route) {
          ctx.status = 404;
          return next();
        }
        // change if routes start accepting additional path parameters
        if (path[ROUTE_POSITION + 1]) {
          ctx.status = 400;
          ctx.body = { message: 'extra path parameters are not supported' };
          return next();
        }
        switch (route) {
          case ROUTE_RESPONSES:
            if (ctx.method !== 'GET') {
              ctx.status = 405;
              return next();
            }
            return handleResponsesRequest(responseTrigrams, ctx, next);
          case ROUTE_CONTEXT:
            if (ctx.method !== 'POST') {
              ctx.status = 405;
              return next();
            }
            // eslint-disable-next-line no-case-declarations
            let transponder = new Transponder(
              channel,
              undefined,
              opt.timeout || DEFAULT_TIMEOUT,
              opt.promise,
            );
            // handleContext awaits the transponder's promise; detaching
            // before it settles would strip the resolver mid-request
            await handleContext(transponder, bodyProp, ctx, next);
            transponder.detach();
            transponder = null;
            return next();
        }
        ctx.status = 404;
        return next();
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
        let ac = new AppCtx(trigram.term, trigram.action, trigram.orient);
        if (!responseTrigrams.has(ac.key)) {
          responseTrigrams.set(ac.key, { ac, count: 0 });
        }
        responseTrigrams.get(ac.key).count += 1;
        debug &&
          console.log(
            '@tao.js/koa::addResponseHandler::responseTrigrams:',
            responseTrigrams,
          );
      }
    },
    removeResponseHandler({ t, term, a, action, o, orient }, handler = noop) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient }),
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        channel.removeInlineHandler(trigram, handler);
        let ac = new AppCtx(trigram.term, trigram.action, trigram.orient);
        let count = !responseTrigrams.has(ac.key)
          ? 0
          : responseTrigrams.get(ac.key).count;
        if (count) {
          responseTrigrams.get(ac.key).count -= 1;
        }
      }
    },
  };
}
