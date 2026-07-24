import { createImportLoader } from '@tao.js/routing-core';

/** @typedef {import('@tao.js/core').Kernel} Kernel */
/** @typedef {import('@tao.js/routing-core').ImportLoaderOptions} ImportLoaderOptions */
/** @typedef {import('@tao.js/routing-core').ImportLoader} ImportLoader */

/**
 * TanStack Router-oriented alias of `createImportLoader`.
 * Use the returned function inside a route `loader`: it dynamic-imports a
 * TAO feature module, initializes it against the Kernel, and resolves with
 * the `{ signal }` bag `useLoaderSignal` reads back via `useLoaderData`.
 *
 * @param {Kernel} TAO
 * @param {ImportLoaderOptions} [options]
 * @returns {ImportLoader}
 */
export function importLoader(TAO, options) {
  return createImportLoader(TAO, options);
}
