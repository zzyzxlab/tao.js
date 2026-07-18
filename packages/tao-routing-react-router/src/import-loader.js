import { createImportLoader } from '@tao.js/routing-core';

/**
 * React Router-oriented alias of `createImportLoader`.
 * Use the returned function as a route `loader` helper.
 */
export function importLoader(TAO, options) {
  return createImportLoader(TAO, options);
}
