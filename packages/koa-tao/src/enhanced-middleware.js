// import { AppCtx } from '@tao.js/core';
import cartesian from 'cartesian';
import { Transceiver } from '@tao.js/utils';
import { noop, normalizeAC, cleanInput } from './helpers';

const DEFAULT_NAME = 'koa-enhanced-middleware';
const TRANSCEIVER_NAME_TYPE = 'transceiver';
const DEFAULT_TIMEOUT = 0;

function getNameId(type, name) {
  return newId => {
    return `${name}-${type}-${newId}`;
  };
}

function buildCtxTao(transceiver) {
  return {
    setCtx({ t, term, a, action, o, orient }, data) {
      return transceiver.setCtx({ t, term, a, action, o, orient }, data);
    },
    setAppCtx(ac) {
      return transceiver.setAppCtx(ac);
    }
  };
}

/**
 * Use the `enhancedMiddleware` to build koa apps that work with your TAO Signal Network on the
 * koa app server. Different from the `simpleMiddleware`, the `enhancedMiddleware` utilizes a
 * Transceiver to provide control for how promises are managed within the handlers attached
 * to the TAO Network that the `enhancedMiddleware` wraps (first arg)
 *
 * @export
 * @param {Kernel} TAO
 * @param {Object} [opt={}]
 * @param {string} [opt.name] - name to prepend to the TAO Channel and Transceiver names that will be generated
 * @param {number} [opt.timeout=0] - timeout in Milliseconds to wait on completing a TAO chain before the Transponder rejects the Promise
 * @param {Promise} [opt.promise=Promise] - Promise constructor used to create promises returned by `setCtx` and `setAppCtx`
 * @returns {Object} - an Object instantiated to attach a `middleware` to a koa app and add/remove response handlers
 */
export default function enhancedMiddleware(TAO, opt = {}) {
  const namer = getNameId(TRANSCEIVER_NAME_TYPE, opt.name || DEFAULT_NAME);
  const transceiver = new Transceiver(
    TAO,
    namer,
    opt.timeout || DEFAULT_TIMEOUT,
    opt.promise
  );
  return {
    middleware() {
      return (ctx, next) => {
        ctx.tao = buildCtxTao(transceiver);
        next();
        ctx.tao = null;
      };
    },
    addInterceptHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.addInterceptHandler(trigram, handler);
      }
    },
    addAsyncHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.addAsyncHandler(trigram, handler);
      }
    },
    addInlineHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.addInlineHandler(trigram, handler);
      }
    },
    removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.removeInterceptHandler(trigram, handler);
      }
    },
    removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.removeAsyncHandler(trigram, handler);
      }
    },
    removeInlineHandler({ t, term, a, action, o, orient }, handler) {
      const trigrams = cleanInput(
        normalizeAC({ t, term, a, action, o, orient })
      );
      const permutations = cartesian(trigrams);
      for (let trigram of permutations) {
        transceiver.removeInlineHandler(trigram, handler);
      }
    }
  };
}
