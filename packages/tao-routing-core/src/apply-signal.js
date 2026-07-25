import { AppCtx } from '@tao.js/core';

/** @typedef {import('@tao.js/core').Trigram} Trigram */

/**
 * Positional route-entry signal: a trigram plus optional context data,
 * spread into `kernel.setCtx(...)`.
 *
 * @typedef {[tao: Trigram, data?: *]} SignalTuple
 */

/**
 * Keyed route-entry signal: a trigram under `tao` plus optional context
 * data under `data`, applied as `kernel.setCtx(tao, data)`.
 *
 * @typedef {{ tao: Trigram, data?: * }} SignalDescriptor
 */

/**
 * A route-entry signal — the value a host-router loader produces (under
 * `{ signal }`) and the route-entry hooks apply to the Kernel:
 * - an {@link AppCtx} instance → `setAppCtx`
 * - a {@link SignalTuple} `[tao, data?]` → `setCtx(...signal)`
 * - a {@link SignalDescriptor} `{ tao, data? }` → `setCtx(tao, data)`
 *
 * @typedef {AppCtx | SignalTuple | SignalDescriptor} RouteSignal
 */

/**
 * The Kernel-shaped target a route-entry signal is applied to. Structural
 * on purpose (this package never imports React or requires a concrete
 * Kernel): any object with `setCtx` / `setAppCtx` — a `@tao.js/core`
 * Kernel satisfies it.
 *
 * @typedef {object} SignalTarget
 * @property {(trigram: Trigram, data?: *) => void} setCtx
 * @property {(appCtx: AppCtx) => void} setAppCtx
 */

/**
 * Apply a route-entry signal to a Kernel.
 *
 * Accepted shapes (the useLoaderSignal route-entry contract):
 * - `AppCtx` → `setAppCtx`
 * - `[tao, data?]` → `setCtx(...signal)` when non-empty
 * - `{ tao, data? }` → `setCtx(tao, data)` when `tao` is truthy
 *
 * @param {SignalTarget} kernel
 * @param {RouteSignal | null | undefined} signal
 * @returns {boolean} whether a context was set
 */
export function applySignal(kernel, signal) {
  if (signal == null) {
    return false;
  }

  if (signal instanceof AppCtx) {
    kernel.setAppCtx(signal);
    return true;
  }

  if (Array.isArray(signal)) {
    // Runtime defends against [] even though the tuple type starts at length 1.
    if (/** @type {ReadonlyArray<*>} */ (signal).length === 0) {
      return false;
    }
    kernel.setCtx(...signal);
    return true;
  }

  // Non-objects (and objects without a truthy `tao`) fall through via !tao.
  const tao = signal.tao;
  if (!tao) {
    return false;
  }

  kernel.setCtx(tao, signal.data);
  return true;
}
