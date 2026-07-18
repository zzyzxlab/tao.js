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

  // Default unused when Provider always supplies value; keep null sentinel.
  const WrappingContext = createContext(null);

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
