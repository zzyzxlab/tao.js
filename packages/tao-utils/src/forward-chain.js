import { AppCtx, INTERCEPT, ASYNC, INLINE } from '@tao.js/core';
import { transferToAppCtx } from './transfer';

function forward(kernel, from, to, type, opts) {
  const { t, term, a, action, o, orient } = to;
  const handler = (tao, data) => transferToAppCtx(tao, data, to, opts);
  kernel[`add${type}Handler`](from, handler);
  handler.remove = () => kernel[`remove${type}Handler`](from, handler);
  return handler;
}

/**
 * Convenience function that strictly copies the Incoming (from) Application Context to the defined Outgoing (to)
 * Application Context to chain it along using an `InlineHandler` setting the data as:
 * - from.t => to.t
 * - from.a => to.a
 * - from.o => to.o
 *
 * Returns the created handler function as well as a .remove() function on the handler to
 * automatically remove it from the kernel that was passed in
 *
 * @export
 * @param  {any} kernel a TAO Kernel (TAO) that can attach handlers and receive TAO signals
 * @param  {any} from trigram representing the Application Context to chain from
 * @param  {any} to trigram representing the Application Context to chain to
 * @param {{
 *   transformTerm: function,
 *   transformAction: function,
 *   transformOrient: function,
 * }} opts optional functions to transform the datagrams in the new AppCtx
 * @return {function} the handler so that it can be removed from the kernel if needed
 */
export function forwardInline(kernel, from, to, opts) {
  return forward(kernel, from, to, INLINE, opts);
}

/**
 * Convenience function that strictly copies the Incoming (from) Application Context to the defined Outgoing (to)
 * Application Context to chain it along using an `AsyncHandler` setting the data as:
 * - from.t => to.t
 * - from.a => to.a
 * - from.o => to.o
 *
 * Returns the created handler function as well as a .remove() function on the handler to
 * automatically remove it from the kernel that was passed in
 *
 * @export
 * @param  {any} kernel a TAO Kernel (TAO) that can attach handlers and receive TAO signals
 * @param  {any} from trigram representing the Application Context to chain from
 * @param  {any} to trigram representing the Application Context to chain to
 * @param {{
 *   transformTerm: function,
 *   transformAction: function,
 *   transformOrient: function,
 * }} opts optional functions to transform the datagrams in the new AppCtx
 * @return {function} the handler so that it can be removed from the kernel if needed
 */
export function forwardAsync(kernel, from, to, opts) {
  return forward(kernel, from, to, ASYNC, opts);
}

/**
 * Convenience function that strictly copies the Incoming (from) Application Context to the defined Outgoing (to)
 * Application Context to chain it along using an `InterceptHandler` setting the data as:
 * - from.t => to.t
 * - from.a => to.a
 * - from.o => to.o
 *
 * Returns the created handler function as well as a .remove() function on the handler to
 * automatically remove it from the kernel that was passed in
 *
 * @export
 * @param  {any} kernel a TAO Kernel (TAO) that can attach handlers and receive TAO signals
 * @param  {any} from trigram representing the Application Context to chain from
 * @param  {any} to trigram representing the Application Context to chain to
 * @param {{
 *   transformTerm: function,
 *   transformAction: function,
 *   transformOrient: function,
 * }} opts optional functions to transform the datagrams in the new AppCtx
 * @return {function} the handler so that it can be removed from the kernel if needed
 */
export function forwardIntercept(kernel, from, to, opts) {
  return forward(kernel, from, to, INTERCEPT, opts);
}
