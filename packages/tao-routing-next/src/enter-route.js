import { applySignal } from '@tao.js/routing-core';

/**
 * Server-friendly entry: apply a route signal to a Kernel (RSC / route handlers).
 *
 * @param {*} kernel
 * @param {*} signal
 * @returns {boolean}
 */
export function enterRoute(kernel, signal) {
  return applySignal(kernel, signal);
}
