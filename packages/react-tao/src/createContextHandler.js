import React, { createContext } from 'react';

import useTaoDataState from './useTaoDataState';

/**
 * Factory returning a Provider/Consumer pair bound to trigram handler state.
 * Used by `withContext` and as a lower-level escape hatch.
 */
export default function createContextHandler(tao, handler, defaultValue) {
  if (handler != null && typeof handler !== 'function') {
    throw new Error('createContextHandler `handler` must be a function');
  }

  const initial =
    typeof defaultValue === 'function'
      ? undefined
      : defaultValue != null
        ? defaultValue
        : {};
  const WrappingContext = createContext(initial);

  function Provider({ children }) {
    const state = useTaoDataState(tao, handler, defaultValue);
    return (
      <WrappingContext.Provider value={state}>
        {children}
      </WrappingContext.Provider>
    );
  }
  Provider.displayName = 'TaoCreateContextHandlerProvider';

  return {
    Provider,
    Consumer: WrappingContext.Consumer,
  };
}
