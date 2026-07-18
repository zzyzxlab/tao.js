import { createImportLoader } from '@tao.js/routing-core';

/**
 * TanStack Router-oriented alias of `createImportLoader`.
 */
export function importLoader(TAO, options) {
  return createImportLoader(TAO, options);
}
