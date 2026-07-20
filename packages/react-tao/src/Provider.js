import React from 'react';
import PropTypes from 'prop-types';
import TAO, { Kernel } from '@tao.js/core';

import { DataLayerContext } from './DataLayerContext';
import { warnDeprecated } from './deprecations';

/**
 * Root TAO + empty data bag / data-layer stack.
 * Each DataHandler nests Provider `data[name]` (deprecated bag) and pushes
 * onto DataLayerContext for tree-scoped `useTaoData` lookups.
 */
const Context = React.createContext({
  TAO,
  data: {},
});

export { Context };

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
