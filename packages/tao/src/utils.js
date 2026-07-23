/** @typedef {import('./AppCtxRoot').Trigram} Trigram */
/** @typedef {import('./AppCtxHandlers').Handler} Handler */

// taken from http://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable
/**
 * Whether a value is iterable — strings excluded on purpose (a string arg
 * is a trigram part, never a collection).
 * @param {*} obj
 * @returns {obj is Iterable<any>}
 */
export function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  if (typeof obj === 'string') {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

/**
 * Normalize a trigram to long keys only; long keys win when both styles
 * are present. Missing parts stay undefined (wild).
 * @param {Trigram} ac
 * @returns {{term: (string|undefined), action: (string|undefined), orient: (string|undefined)}}
 */
export function _cleanAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o,
  };
}

/**
 * Throw unless the handler is a function.
 * @param {Handler} handler
 * @throws {Error} when `handler` is missing or not a function
 */
export function _validateHandler(handler) {
  if (!handler) {
    throw new Error('cannot do anything with missing handler');
  }
  if (typeof handler !== 'function') {
    throw new Error('handler must be a function');
  }
}
