import { createImportLoader } from '@tao.js/routing-core';

/** @typedef {import('@tao.js/core').Kernel} Kernel */
/** @typedef {import('@tao.js/routing-core').ImportLoaderOptions} ImportLoaderOptions */
/** @typedef {import('@tao.js/routing-core').ImportLoader} ImportLoader */

/**
 * Next.js-oriented alias of `createImportLoader` for route/feature modules:
 * dynamic-imports a TAO feature module, initializes it against the Kernel,
 * and resolves with the `{ signal }` bag to hand `useRouteSignal` /
 * `enterRoute` (via `getSignal`).
 *
 * @param {Kernel} TAO
 * @param {ImportLoaderOptions} [options]
 * @returns {ImportLoader}
 */
export function importLoader(TAO, options) {
  return createImportLoader(TAO, options);
}
