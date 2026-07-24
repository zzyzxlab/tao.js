import { createContext, useContext } from 'react';

/**
 * One tree-scoped named data layer pushed by a `DataHandler`.
 * @typedef {Object} DataLayer
 * @property {string} name - the DataHandler `name` prop (the lookup key)
 * @property {*} value - that DataHandler's current handler-managed data
 */

/**
 * Ancestor stack of `{ name, value }` from nested DataHandlers.
 * Root is `[]`. Lookup walks from the end (nearest wins).
 * @type {import('react').Context<DataLayer[]>}
 */
export const DataLayerContext = createContext([]);

/**
 * The ancestor DataHandler layer stack for this position in the tree
 * (empty array at the root / outside any DataHandler).
 * @returns {DataLayer[]}
 */
export function useDataLayers() {
  return useContext(DataLayerContext);
}
