import React from 'react';
import PropTypes from 'prop-types';
import TAO, { Kernel } from '@tao.js/core';

import { DataLayerContext } from './DataLayerContext';
import { warnDeprecated } from './deprecations';

/**
 * Value provided by {@link TaoProvider} (and re-provided by each nested
 * `DataHandler`): the Kernel for this tree plus the merged named-data bag.
 * @typedef {Object} ProviderContextValue
 * @property {Kernel} TAO - the Kernel descendants signal and subscribe on
 * @property {Object<string, *>} data - merged `name -> data` bag from
 *           ancestor DataHandlers (deprecated consume surface — prefer
 *           `useTaoData(name)`)
 */

/**
 * Props for {@link TaoProvider} (and the deprecated `Provider` alias).
 * @typedef {Object} TaoProviderProps
 * @property {Kernel} TAO - the Kernel instance this React tree uses
 * @property {import('react').ReactNode} [children]
 */

/**
 * Root TAO + empty data bag / data-layer stack.
 * Each DataHandler nests Provider `data[name]` (deprecated bag) and pushes
 * onto DataLayerContext for tree-scoped `useTaoData` lookups.
 * @type {import('react').Context<ProviderContextValue>}
 */
const Context = React.createContext({
  TAO,
  data: {},
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
    <Context.Provider value={{ TAO: kernel, data: {} }}>
      <DataLayerContext.Provider value={emptyLayers}>
        {children}
      </DataLayerContext.Provider>
    </Context.Provider>
  );
}

// Stryker disable next-line StringLiteral: displayName is DX-only
TaoProvider.displayName = 'TaoProvider';

TaoProvider.propTypes = {
  TAO: PropTypes.instanceOf(Kernel).isRequired,
  children: PropTypes.node,
};

/**
 * @deprecated Use {@link TaoProvider} instead.
 * @param {TaoProviderProps} props
 * @returns {import('react').ReactElement}
 */
function Provider(props) {
  warnDeprecated(
    'Provider',
    '[@tao.js/react] `Provider` is deprecated; import `TaoProvider` instead.',
  );
  return <TaoProvider {...props} />;
}

// Stryker disable next-line StringLiteral: displayName is DX-only
Provider.displayName = 'Provider';
Provider.propTypes = TaoProvider.propTypes;

export { TaoProvider, Provider };
export default TaoProvider;
