import { createContext, useContext } from 'react';

/**
 * Set by SwitchHandler when wrapping RenderHandlers.
 * `null` means RenderHandler is standalone.
 */
export const SwitchContext = createContext(null);

export function useSwitchContext() {
  return useContext(SwitchContext);
}
