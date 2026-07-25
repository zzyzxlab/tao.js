import React from 'react';
import TAO, { Kernel } from '@tao.js/core';

import { DataLayerContext } from './DataLayerContext';

/**
 * Value provided by {@link TaoProvider}: the Kernel for this tree.
 * @typedef {Object} ProviderContextValue
 * @property {Kernel} TAO - the Kernel descendants signal and subscribe on
 */

/**
 * Props for {@link TaoProvider}.
 * @typedef {Object} TaoProviderProps
 * @property {Kernel} TAO - the Kernel instance this React tree uses
 * @property {import('react').ReactNode} [children]
 */

/**
 * Root TAO context. Named data lives on the tree-scoped
 * {@link DataLayerContext} stack maintained by `DataHandler` and read with
 * `useTaoData(name)`.
 * @type {import('react').Context<ProviderContextValue>}
 */
const Context = React.createContext({
  TAO,
});

export { Context };

/**
 * Makes a Kernel available to all @tao.js/react components and hooks in the
 * tree (and resets the tree-scoped DataHandler layer stack).
 * @param {TaoProviderProps} props
 * @returns {import('react').ReactElement}
 */
function TaoProvider({ TAO: kernel, children }) {
  // Root layer stack must be empty so useTaoData() is undefined until a DataHandler pushes.
  const emptyLayers = [];
  return (
    <Context.Provider value={{ TAO: kernel }}>
      <DataLayerContext.Provider value={emptyLayers}>
        {children}
      </DataLayerContext.Provider>
    </Context.Provider>
  );
}

// Stryker disable next-line StringLiteral: displayName is DX-only
TaoProvider.displayName = 'TaoProvider';

export { TaoProvider };
export default TaoProvider;
