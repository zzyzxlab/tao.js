import { createContext, useContext } from 'react';

/**
 * Ancestor stack of `{ name, value }` from nested DataHandlers.
 * Root is `[]`. Lookup walks from the end (nearest wins).
 */
export const DataLayerContext = createContext([]);

export function useDataLayers() {
  return useContext(DataLayerContext);
}
