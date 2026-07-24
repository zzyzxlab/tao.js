import { createContext, useContext } from 'react';

/**
 * Selection context a `SwitchHandler` provides to its subtree.
 * @typedef {Object} SwitchContextValue
 * @property {import('./helpers').NormalizedTrigram} defaults - the
 *           SwitchHandler's normalized default trigram parts
 * @property {{tao: import('./helpers').TaoSignal|undefined, data: *}} signal -
 *           the latest chosen AppCon signal (`tao`/`data` are undefined
 *           before any match)
 */

/**
 * Set by SwitchHandler when wrapping RenderHandlers.
 * `null` means RenderHandler is standalone.
 * @type {import('react').Context<SwitchContextValue|null>}
 */
export const SwitchContext = createContext(null);

/**
 * The nearest SwitchHandler's selection context, or `null` when standalone.
 * @returns {SwitchContextValue|null}
 */
export function useSwitchContext() {
  return useContext(SwitchContext);
}
