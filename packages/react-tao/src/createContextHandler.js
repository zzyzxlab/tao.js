import React, { createContext } from 'react';

import useTaoDataState from './useTaoDataState';

/** @typedef {import('./helpers').TrigramProps} TrigramProps */
/**
 * @template [S=any]
 * @typedef {import('./useTaoDataState').TaoDataHandler<S>} TaoDataHandler
 */

/**
 * A Provider/Consumer pair bound to trigram-driven handler state.
 * @template [S=any]
 * @typedef {Object} ContextHandler
 * @property {import('react').FunctionComponent<{children?: import('react').ReactNode}>} Provider -
 *           subscribes to the trigram(s) while mounted and provides the
 *           current handler state to descendants
 * @property {import('react').Consumer<S>} Consumer - render-prop consumer of
 *           the current handler state
 */

/**
 * Factory returning a Provider/Consumer pair bound to trigram handler state.
 * Used by `withContext` and as a lower-level escape hatch.
 * @template [S=any]
 * @param {?TrigramProps} tao - trigram(s) to subscribe to (array parts
 *        multi-match; null/empty = one all-wildcard subscription)
 * @param {?TaoDataHandler<S>} [handler] - derives the next state per signal
 *        (`(tao, data, set, current) => …`); omitted = AppCon data becomes
 *        the state
 * @param {S|(() => S)} [defaultValue] - initial state or lazy initializer
 * @returns {ContextHandler<S>}
 * @throws {Error} when `handler` is given but not a function
 */
export default function createContextHandler(tao, handler, defaultValue) {
  if (handler != null && typeof handler !== 'function') {
    throw new Error('createContextHandler `handler` must be a function');
  }

  // Default unused when Provider always supplies value; keep null sentinel.
  const WrappingContext = createContext(/** @type {S} */ (null));

  /**
   * Subscribes while mounted and provides the handler state to descendants.
   * @param {{children?: import('react').ReactNode}} props
   */
  function Provider({ children }) {
    const state = useTaoDataState(tao, handler, defaultValue);
    return (
      <WrappingContext.Provider value={state}>
        {children}
      </WrappingContext.Provider>
    );
  }
  // Stryker disable next-line StringLiteral: displayName is DX-only
  Provider.displayName = 'TaoCreateContextHandlerProvider';

  return {
    Provider,
    Consumer: WrappingContext.Consumer,
  };
}
