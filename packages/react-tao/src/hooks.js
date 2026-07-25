import React from 'react';

import { Context } from './Provider';
import { useDataLayers } from './DataLayerContext';
import { getPermutations } from './helpers';

/** @typedef {import('@tao.js/core').Kernel} Kernel */
/** @typedef {import('@tao.js/core').Handler} Handler */
/** @typedef {import('./helpers').TrigramProps} TrigramProps */

/**
 * The Kernel provided by the nearest `TaoProvider`.
 * @returns {Kernel}
 */
export function useTaoContext() {
  const { TAO } = React.useContext(Context);
  return TAO;
}

/**
 * Shared add/remove effect behind the phase-specific handler hooks.
 * @param {'Inline'|'Async'|'Intercept'} handlerType
 * @param {TrigramProps} trigramProps
 * @param {Handler} handler
 * @param {import('react').DependencyList} [dependencies]
 * @returns {void}
 */
function useTaoEffect(
  handlerType,
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  const [addingHandler, removingHandler] = [
    `add${handlerType}Handler`,
    `remove${handlerType}Handler`,
  ];
  const TAO = useTaoContext();
  const permutations = getPermutations({ t, term, a, action, o, orient });
  React.useEffect(() => {
    permutations.forEach((trigram) => TAO[addingHandler](trigram, handler));
    return () => {
      permutations.forEach((trigram) => TAO[removingHandler](trigram, handler));
    };
  }, dependencies);
}

/**
 * Register `handler` as an inline-phase handler for every permutation of the
 * trigram while mounted.
 * @param {TrigramProps} trigramProps - trigram(s) to match (array parts
 *        multi-match; missing parts are wildcards)
 * @param {Handler} handler - `(tao, data) => …`; may return an AppCtx to chain
 * @param {import('react').DependencyList} [dependencies] - effect deps
 *        controlling re-subscription (omit to resubscribe every render)
 * @returns {void}
 */
export function useTaoInlineHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  useTaoEffect(
    'Inline',
    { t, term, a, action, o, orient },
    handler,
    dependencies,
  );
}

/**
 * Register `handler` as an async-phase handler for every permutation of the
 * trigram while mounted.
 * @param {TrigramProps} trigramProps - trigram(s) to match (array parts
 *        multi-match; missing parts are wildcards)
 * @param {Handler} handler - `(tao, data) => …`; may return an AppCtx to chain
 * @param {import('react').DependencyList} [dependencies] - effect deps
 *        controlling re-subscription (omit to resubscribe every render)
 * @returns {void}
 */
export function useTaoAsyncHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  useTaoEffect(
    'Async',
    { t, term, a, action, o, orient },
    handler,
    dependencies,
  );
}

/**
 * Register `handler` as an intercept-phase handler for every permutation of
 * the trigram while mounted (truthy return halts the dispatch; returning an
 * AppCtx replaces it).
 * @param {TrigramProps} trigramProps - trigram(s) to match (array parts
 *        multi-match; missing parts are wildcards)
 * @param {Handler} handler - `(tao, data) => …`
 * @param {import('react').DependencyList} [dependencies] - effect deps
 *        controlling re-subscription (omit to resubscribe every render)
 * @returns {void}
 */
export function useTaoInterceptHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  useTaoEffect(
    'Intercept',
    { t, term, a, action, o, orient },
    handler,
    dependencies,
  );
}

/**
 * Tree-scoped named data from ancestor DataHandlers (nearest wins — an inner
 * DataHandler shadows an outer one with the same name).
 * @param {string} [name] - the DataHandler `name` to look up; omitted or
 *        empty returns the nearest DataHandler's value
 * @returns {*} the matching DataHandler's current data, or `undefined` when
 *        no ancestor DataHandler matches
 */
export function useTaoData(name) {
  const layers = useDataLayers();
  if (!layers || !layers.length) {
    return;
  }
  if (name == null || name === '') {
    return layers[layers.length - 1].value;
  }
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    if (layers[i].name === name) {
      return layers[i].value;
    }
  }
}

/**
 * @deprecated Since 0.17 — alias of `useTaoData`; prefer `useTaoData(name)`.
 * Still reads the tree-scoped layer (same as useTaoData) for a named slot.
 * @param {string} [name] - the DataHandler `name` to look up
 * @returns {*} the matching DataHandler's current data, or `undefined`
 */
export function useTaoDataContext(name) {
  return useTaoData(name);
}
