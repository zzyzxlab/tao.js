import { createImportLoader } from '@tao.js/routing-core';

/**
 * Next.js-oriented alias of `createImportLoader` for route/feature modules.
 */
export function importLoader(TAO, options) {
  return createImportLoader(TAO, options);
}
