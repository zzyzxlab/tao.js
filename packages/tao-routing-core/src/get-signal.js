/** @typedef {import('./create-import-loader').LoaderResult} LoaderResult */
/** @typedef {import('./apply-signal').RouteSignal} RouteSignal */

/**
 * Read `signal` from a loader/route data bag (`{ signal }`).
 *
 * @param {LoaderResult | null | undefined} loaderData - typically the host
 *        router's loader data (the {@link LoaderResult} an import loader
 *        produced); tolerates anything nullish or signal-less
 * @returns {RouteSignal | null | undefined}
 */
export function getSignal(loaderData) {
  if (loaderData == null) {
    return undefined;
  }
  return loaderData.signal;
}
