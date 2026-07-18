import React from 'react';
import PropTypes from 'prop-types';
import TAO, { Kernel } from '@tao.js/core';

import { DataLayerContext } from './DataLayerContext';

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

function Provider({ TAO: kernel, children }) {
  return (
    <Context.Provider value={{ TAO: kernel, data: {} }}>
      <DataLayerContext.Provider value={[]}>
        {children}
      </DataLayerContext.Provider>
    </Context.Provider>
  );
}

Provider.displayName = 'Provider';

Provider.propTypes = {
  TAO: PropTypes.instanceOf(Kernel).isRequired,
  children: PropTypes.node,
};

export default Provider;
