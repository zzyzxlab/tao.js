import React, { useContext, useMemo } from 'react';

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
 * Subscribes to TAO trigrams and exposes named state to descendants by
 * pushing onto the tree-scoped data layer stack (ancestor walk — read with
 * `useTaoData(name)`).
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
  const parentLayers = useContext(DataLayerContext);
  const localData = useTaoDataState(
    { term, action, orient, t, a, o },
    handler,
    defaultValue,
  );

  // Stryker disable all: useMemo deps / object literals — contents asserted; memo identity not observable
  const nextLayers = useMemo(
    () => [...parentLayers, { name, value: localData }],
    [parentLayers, name, localData],
  );
  // Stryker restore all

  return (
    <DataLayerContext.Provider value={nextLayers}>
      {children}
    </DataLayerContext.Provider>
  );
}

// Stryker disable next-line StringLiteral: displayName is DX-only
DataHandler.displayName = 'DataHandler';

export default DataHandler;
