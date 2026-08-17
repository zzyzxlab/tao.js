/** @typedef {import('./wire').NetworkSurface} NetworkSurface */

/**
 * Recursively freeze a value. Objects already frozen are still walked so
 * unfrozen children become frozen. Cycles are skipped via `seen`.
 *
 * @param {*} value
 * @param {WeakSet<object>} [seen]
 * @returns {*} the same value
 */
function deepFreeze(value, seen) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (!seen) {
    seen = new WeakSet();
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  // Stryker disable next-line ConditionalExpression: Object.freeze is idempotent — always-freeze equals freeze-if-needed
  if (!Object.isFrozen(value)) {
    Object.freeze(value);
  }
  const keys = Object.keys(value);
  for (const key of keys) {
    deepFreeze(value[key], seen);
  }
  return value;
}

/**
 * Resolve a Kernel-shaped wrapper or a Network to the decorate() surface.
 *
 * @param {NetworkSurface} surface
 * @returns {NetworkSurface}
 */
function resolveDecoratable(surface) {
  const network =
    surface && typeof surface.decorate === 'function'
      ? surface
      : surface && surface._network;
  if (!network || typeof network.decorate !== 'function') {
    throw new Error(
      'freezeDatum requires a Network or Kernel (a surface with decorate())',
    );
  }
  return network;
}

/**
 * Development-mode datum freeze (TAO-SPEC.md §2 / ENVELOPE-SPEC.md §13): a
 * powerless observation that deep-freezes `ac.data` at `onReceived`, before
 * any handler runs. Attach it yourself — core never inspects `NODE_ENV`.
 *
 * Pass the Kernel or Network you dispatch on. `freezeDatum(channel)` attaches
 * to the Channel's private registry (channel-attached / mirrored dispatches
 * only), not the main network.
 *
 * @param {NetworkSurface} surface - a Network (`decorate`) or Kernel-shaped
 *        wrapper (`_network`)
 * @returns {() => void} dispose - removes the decoration
 * @throws {Error} when `surface` cannot be resolved to a `decorate()` surface
 */
export default function freezeDatum(surface) {
  const network = resolveDecoratable(surface);
  return network.decorate({
    name: 'freezeDatum',
    onReceived(ac) {
      deepFreeze(ac.data);
    },
  });
}
