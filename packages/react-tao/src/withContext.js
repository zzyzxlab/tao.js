import React from 'react';

import createContextHandler from './createContextHandler';

/** @typedef {import('./helpers').TrigramProps} TrigramProps */
/**
 * @template [S=any]
 * @typedef {import('./useTaoDataState').TaoDataHandler<S>} TaoDataHandler
 */

/**
 * HOC factory: subscribes to trigram-driven handler state and injects it
 * into the wrapped component as the `data` prop (all other props pass
 * through unchanged).
 * @template [S=any]
 * @param {?TrigramProps} tao - trigram(s) to subscribe to (array parts
 *        multi-match; null/empty = one all-wildcard subscription)
 * @param {TaoDataHandler<S>} handler - derives the next state per signal
 *        (`(tao, data, set, current) => …`); required
 * @param {S|(() => S)} [defaultValue] - initial state or lazy initializer
 * @returns {(ComponentToWrap: import('react').ComponentType<*>) => import('react').FunctionComponent<*>}
 *          HOC rendering `ComponentToWrap` with `data` = the current handler
 *          state plus all passthrough props
 * @throws {Error} when `handler` is not a function
 */
export default function withContext(tao, handler, defaultValue) {
  if (typeof handler !== 'function') {
    throw new Error('withContext `handler` must be a function');
  }
  const WrappingContext = createContextHandler(tao, handler, defaultValue);
  return (ComponentToWrap) => {
    const wrappedComponent = (props) => (
      <WrappingContext.Provider>
        <WrappingContext.Consumer>
          {/* value =>
            React.cloneElement(ComponentToWrap, { data: value, ...props })
          */}
          {(value) => <ComponentToWrap data={value} {...props} />}
        </WrappingContext.Consumer>
      </WrappingContext.Provider>
    );
    wrappedComponent.displayName = `withContext(${
      ComponentToWrap.displayName || ComponentToWrap.name
    })`;
    return wrappedComponent;
  };
}
