import { AppCtx } from '@tao.js/core';

/**
 * Apply a route-entry signal to a Kernel.
 *
 * Accepted shapes (same as tidy.dev / useLoaderSignal):
 * - `AppCtx` → `setAppCtx`
 * - `[tao, data?]` → `setCtx(...signal)` when non-empty
 * - `{ tao, data? }` → `setCtx(tao, data)` when `tao` is truthy
 *
 * @param {{ setAppCtx: Function, setCtx: Function }} kernel
 * @param {*} signal
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
    if (signal.length === 0) {
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
