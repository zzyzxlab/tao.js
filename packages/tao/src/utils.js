// taken from http://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable
export function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

// needed a convenience function for this
export function concatIterables(...iterables) {
  const rv = [];
  if (iterables.length) {
    iterables.forEach(list => {
      if (list.length) {
        list.forEach(item => rv.concat(item));
      }
    });
  }
  return rv;
}
