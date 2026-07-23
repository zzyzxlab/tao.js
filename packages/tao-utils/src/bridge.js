import { Kernel, AppCtx, INTERCEPT, ASYNC, INLINE } from '@tao.js/core';

const NOOP = () => {};

function forwardHandler(destination) {
  return (tao, data) => {
    // console.log('bridging::tao', tao);
    if (tao instanceof AppCtx) {
      destination.setAppCtx(tao);
    } else {
      destination.setCtx(tao, data);
    }
  };
}

function filteredForwardHandler(destination, filter) {
  const forward = forwardHandler(destination);
  if (!filter) {
    return forward;
  }
  return (tao, data) => {
    if (filter(tao, data)) {
      forward(tao, data);
    }
  };
}

function bridge(type, source, destination, filters) {
  /* c8 ignore next 4 -- public bridge factories always provide a valid phase. */
  // Stryker disable next-line all: unreachable via the exported bridge factories, which always pass a valid phase constant
  if (type !== INTERCEPT && type !== ASYNC && type !== INLINE) {
    return NOOP;
  }
  if (!(source instanceof Kernel) || !(destination instanceof Kernel)) {
    return NOOP;
  }
  const filterFunction =
    typeof filters[0] === 'function' ? filters.shift() : undefined;
  const handler = filteredForwardHandler(destination, filterFunction);
  const attachment = `add${type}Handler`;
  const detachment = `remove${type}Handler`;
  if (!filters.length) {
    source[attachment]({}, handler);
    return () => source[detachment]({}, handler);
  }
  if (Array.isArray(filters[0])) {
    filters = filters[0];
  }
  filters.forEach((trigram) => source[attachment](trigram, handler));
  return () =>
    filters.forEach((trigrams) => source[detachment](trigrams, handler));
}

/**
 * Bridges signals handled on the `source` Kernel into the `destination`
 * Kernel via an `InterceptHandler` — the forwarded signal re-enters the
 * destination through `setCtx` (or `setAppCtx` for AppCtx values). The
 * bridging handler returns nothing, so an intercept bridge observes without
 * halting the source cascade.
 *
 * @export
 * @param {Kernel} source - the Kernel to bridge signals from
 * @param {Kernel} destination - the Kernel to bridge signals into
 * @param {...*} filters - optional leading filter function
 *        `(tao, data) => boolean` gating which signals forward, then
 *        trigrams (or a single array of trigrams) to bridge; with no
 *        trigrams the bridge attaches to the wildcard `{}`
 * @returns {function(): void} detaches the bridge from `source` (a no-op
 *          when `source`/`destination` are not Kernel instances)
 */
export function interceptBridge(source, destination, ...filters) {
  return bridge(INTERCEPT, source, destination, filters);
}

/**
 * Bridges signals handled on the `source` Kernel into the `destination`
 * Kernel via an `AsyncHandler` — the forwarded signal re-enters the
 * destination through `setCtx` (or `setAppCtx` for AppCtx values) on the
 * async fork of the source cascade.
 *
 * @export
 * @param {Kernel} source - the Kernel to bridge signals from
 * @param {Kernel} destination - the Kernel to bridge signals into
 * @param {...*} filters - optional leading filter function
 *        `(tao, data) => boolean` gating which signals forward, then
 *        trigrams (or a single array of trigrams) to bridge; with no
 *        trigrams the bridge attaches to the wildcard `{}`
 * @returns {function(): void} detaches the bridge from `source` (a no-op
 *          when `source`/`destination` are not Kernel instances)
 */
export function asyncBridge(source, destination, ...filters) {
  return bridge(ASYNC, source, destination, filters);
}

/**
 * Bridges signals handled on the `source` Kernel into the `destination`
 * Kernel via an `InlineHandler` — the forwarded signal re-enters the
 * destination through `setCtx` (or `setAppCtx` for AppCtx values) in the
 * source cascade's inline spool.
 *
 * @export
 * @param {Kernel} source - the Kernel to bridge signals from
 * @param {Kernel} destination - the Kernel to bridge signals into
 * @param {...*} filters - optional leading filter function
 *        `(tao, data) => boolean` gating which signals forward, then
 *        trigrams (or a single array of trigrams) to bridge; with no
 *        trigrams the bridge attaches to the wildcard `{}`
 * @returns {function(): void} detaches the bridge from `source` (a no-op
 *          when `source`/`destination` are not Kernel instances)
 */
export function inlineBridge(source, destination, ...filters) {
  return bridge(INLINE, source, destination, filters);
}
