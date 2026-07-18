/**
 * Read `signal` from a loader/route data bag (`{ signal }`).
 *
 * @param {*} loaderData
 * @returns {*}
 */
export function getSignal(loaderData) {
  if (loaderData == null) {
    return undefined;
  }
  return loaderData.signal;
}
