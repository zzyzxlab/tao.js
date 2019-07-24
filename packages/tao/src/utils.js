// taken from http://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable
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

// needed a convenience function for this
export function concatIterables(...iterables) {
  let rv = [];
  if (iterables.length) {
    for (let list of iterables) {
      let iterator = list[Symbol.iterator]();
      if (list.values && typeof list.values === 'function') {
        iterator = list.values();
      }
      for (let item of iterator) {
        rv = rv.concat(item);
      }
    }
  }
  return rv;
}

export function _cleanAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o
  };
}

export function _validateHandler(handler) {
  if (!handler) {
    throw new Error('cannot do anything with missing handler');
  }
  if (typeof handler !== 'function') {
    throw new Error('handler must be a function');
  }
}
