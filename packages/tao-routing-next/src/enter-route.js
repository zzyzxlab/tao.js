import { applySignal } from '@tao.js/routing-core';

/** @typedef {import('@tao.js/routing-core').SignalTarget} SignalTarget */
/** @typedef {import('@tao.js/routing-core').RouteSignal} RouteSignal */

/**
 * Server-friendly entry: apply a route signal to a Kernel (RSC / route handlers).
 *
 * @param {SignalTarget} kernel - the Kernel (or any `setCtx`/`setAppCtx`
 *        target) to signal
 * @param {RouteSignal | null | undefined} signal
 * @returns {boolean} whether a context was set
 */
export function enterRoute(kernel, signal) {
  return applySignal(kernel, signal);
}
