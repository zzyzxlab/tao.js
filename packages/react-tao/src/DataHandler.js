import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';

import { Context } from './Provider';
import { DataLayerContext } from './DataLayerContext';
import useTaoDataState from './useTaoDataState';

/** @typedef {import('./helpers').TrigramPart} TrigramPart */
/**
 * @template [S=any]
 * @typedef {import('./useTaoDataState').TaoDataHandler<S>} TaoDataHandler
 */

/**
 * Props for {@link DataHandler}. Trigram parts (`t`/`term`, `a`/`action`,
 * `o`/`orient`) accept single values or arrays (multi-match); missing parts
 * are wildcards.
 * @typedef {Object} DataHandlerProps
 * @property {string} name - tree-scoped lookup key for `useTaoData(name)`
 *           in descendants (inner DataHandlers shadow outer ones)
 * @property {TaoDataHandler<*>} [handler] - derives the next data per
 *           matching AppCon (`(tao, data, set, current) => …`); omitted =
 *           the AppCon data replaces the value
 * @property {*} [default] - initial data or a lazy initializer function
 *           (defaults to `{}`)
 * @property {import('react').ReactNode} [children]
 * @property {TrigramPart} [term] - the term: the domain thing
 * @property {TrigramPart} [action] - the action: the operation on the term
 * @property {TrigramPart} [orient] - the orient: perspective / role / surface
 * @property {TrigramPart} [t] - the term (short key)
 * @property {TrigramPart} [a] - the action (short key)
 * @property {TrigramPart} [o] - the orient (short key)
 */

/**
 * Subscribes to TAO trigrams and exposes named state to descendants.
 * Pushes onto the tree-scoped data layer (ancestor walk) and merges into
 * Provider `data[name]` for deprecated bag consumers during the 0.17 overlap.
 * @param {DataHandlerProps} props
 * @returns {import('react').ReactElement}
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

  // Stryker disable all: useMemo deps / object literals — contents asserted; memo identity not observable
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
  // Stryker restore all

  return (
    <DataLayerContext.Provider value={nextLayers}>
      <Context.Provider value={providerValue}>{children}</Context.Provider>
    </DataLayerContext.Provider>
  );
}

// Stryker disable all: displayName / propTypes metadata
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
// Stryker restore all

export default DataHandler;
