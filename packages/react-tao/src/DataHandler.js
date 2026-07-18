import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';

import { Context } from './Provider';
import { DataLayerContext } from './DataLayerContext';
import useTaoDataState from './useTaoDataState';

/**
 * Subscribes to TAO trigrams and exposes named state to descendants.
 * Pushes onto the tree-scoped data layer (ancestor walk) and merges into
 * Provider `data[name]` for deprecated bag consumers during the 0.17 overlap.
 */
function DataHandler({
  name,
  handler,
  default: defaultValue,
  children,
  term,
  action,
  orient,
  t,
  a,
  o,
}) {
  const { TAO, data: parentData = {} } = useContext(Context);
  const parentLayers = useContext(DataLayerContext);
  const localData = useTaoDataState(
    { term, action, orient, t, a, o },
    handler,
    defaultValue,
  );

  const nextData = useMemo(
    () => ({
      ...parentData,
      [name]: localData,
    }),
    [parentData, name, localData],
  );

  const nextLayers = useMemo(
    () => [...parentLayers, { name, value: localData }],
    [parentLayers, name, localData],
  );

  const providerValue = useMemo(
    () => ({ TAO, data: nextData }),
    [TAO, nextData],
  );

  return (
    <DataLayerContext.Provider value={nextLayers}>
      <Context.Provider value={providerValue}>{children}</Context.Provider>
    </DataLayerContext.Provider>
  );
}

DataHandler.displayName = 'DataHandler';

DataHandler.propTypes = {
  name: PropTypes.string.isRequired,
  handler: PropTypes.func,
  default: PropTypes.any,
  children: PropTypes.node,
  term: PropTypes.any,
  action: PropTypes.any,
  orient: PropTypes.any,
  t: PropTypes.any,
  a: PropTypes.any,
  o: PropTypes.any,
};

export default DataHandler;
