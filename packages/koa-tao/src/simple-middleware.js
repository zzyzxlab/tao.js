// import { AppCtx } from '@tao.js/core';
import cartesian from 'cartesian';
import { Channel, Transponder } from '@tao.js/utils';
import { noop, normalizeAC, cleanInput } from './helpers';

const DEFAULT_CHANNEL_NAME = 'koa-simple-middleware';
const CHANNEL_NAME_TYPE = 'channel';
const TRANSPONDER_NAME_TYPE = 'transponder';
const DEFAULT_TIMEOUT = 3000;

function getNameId(type, name) {
  return newId => {
    return `${name}-${type}-${newId}`;
  };
}

function buildCtxTao(transponder) {
  return {
    setCtx({ t, term, a, action, o, orient }, data) {
      return transponder.setCtx({ t, term, a, action, o, orient }, data);
    },
    setAppCtx(ac) {
      return transponder.setAppCtx(ac);
    }
  };
}

/**
 * Use the `simpleMiddleware` to build koa apps that work with your TAO Signal Network on the
 * koa app server.
 *
 * @export
 * @param {Kernel} TAO
 * @param {Object} [opt={}]
 * @param {string} [opt.name] - name to prepend to the TAO Channel and Transponder names that will be generated
 * @param {number} [opt.timeout=3000] - timeout in Milliseconds to wait on completing a TAO chain before the Transponder rejects the Promise
 * @param {Promise} [opt.promise=Promise] - Promise constructor used to create promises returned by `setCtx` and `setAppCtx`
 * @param {boolean} [opt.debug] - print console.log of internal behavior
 * @returns {Object} - an Object instantiated to attach a `middleware` to a koa app and add/remove response handlers
 */
export default function simpleMiddleware(TAO, opt = {}) {
  const { debug = false } = opt;
  const namer = getNameId(CHANNEL_NAME_TYPE, opt.name || DEFAULT_CHANNEL_NAME);
  const channel = new Channel(TAO, namer);
  return {
    middleware() {
      return (ctx, next) => {
        const transponder = new Transponder(
          channel,
          getNameId(TRANSPONDER_NAME_TYPE, opt.name),
          opt.timeout || DEFAULT_TIMEOUT,
          opt.promise
        );
        ctx.tao = buildCtxTao(transponder);
        next();
        transponder.detach();
        ctx.tao = null;
        transponder = null;
      };
    },
    addResponseHandler({ t, term, a, action, o, orient }, handler = noop) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
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
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        channel.removeInlineHandler(trigram, handler);
      }
    }
  };
}
