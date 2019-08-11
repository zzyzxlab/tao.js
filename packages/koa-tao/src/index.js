import { AppCtx } from '@tao.js/core';
import cartesian from 'cartesian';
import { Channel, Transponder } from '@tao.js/utils';
import { noop, normalizeAC, cleanInput } from './helpers';

// const noop = () => {};

const DEFAULT_ROOT = 'tao';
const ROUTE_POSITION = 1;
const ROUTE_RESPONSES = 'responses';
const ROUTE_CONTEXT = 'context';

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

function handleResponsesRequest(responseTrigrams, ctx, next) {
  // const out = Array.from(responseTrigrams.values());
  ctx.body = {
    // out,
    responses: Array.from(responseTrigrams.values())
      .filter(r => r.count > 0)
      .map(r => r.ac.unwrapCtx())
  };
  return next();
}

async function handleContext(transponder, bodyProp, ctx, next) {
  const { tao, data } = await getBodyData(ctx, bodyProp);
  try {
    const ac = await transponder.setCtx(tao, data);
    ctx.body = {
      tao: ac.unwrapCtx(),
      data: ac.data
    };
  } catch (err) {
    console.error('Error:', err);
    ctx.status = 404;
  }
  return next();
}

export default function taoMiddleware(TAO, opt = {}) {
  const responseTrigrams = new Map();
  const bodyProp = opt.json;
  const rootPath = opt.root || DEFAULT_ROOT;
  const rootTest = new RegExp(`/${rootPath}/([^/]+)/?(.*)?`, 'i');
  const transponder = new Transponder(TAO, opt.name, 3000);
  transponder.addInlineHandler({}, (tao, data) =>
    console.log('taoMiddleware::hitting the first with:', tao, data)
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
            return handleContext(transponder, bodyProp, ctx, next);
          default:
            ctx.status = 404;
            return next();
        }
      };
    },
    addResponseHandler({ t, term, a, action, o, orient }, handler = noop) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        console.log('@tao.js/koa::addResponseHandler::trigram:', trigram);
        transponder.addInlineHandler(trigram, handler);
        let ac = new AppCtx(trigram.term, trigram.action, trigram.orient);
        if (!responseTrigrams.has(ac.key)) {
          responseTrigrams.set(ac.key, { ac, count: 0 });
        }
        responseTrigrams.get(ac.key).count += 1;
        console.log(
          '@tao.js/koa::addResponseHandler::responseTrigrams:',
          responseTrigrams
        );
      }
    },
    removeResponseHandler({ t, term, a, action, o, orient }, handler = noop) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transponder.removeInlineHandler(trigram, handler);
        let ac = new AppCtx(trigram.term, trigram.action, trigram.orient);
        let count = !responseTrigrams.has(ac.key)
          ? 0
          : responseTrigrams.get(ac.key).count;
        if (count) {
          responseTrigrams.get(ac.key).count -= 1;
        }
      }
    }
  };
}
