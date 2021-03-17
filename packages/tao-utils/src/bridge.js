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
  filters.forEach(trigram => source[attachment](trigram, handler));
  return () =>
    filters.forEach(trigrams => source[detachment](trigrams, handler));
}

export function interceptBridge(source, destination, ...filters) {
  return bridge(INTERCEPT, source, destination, filters);
}

export function asyncBridge(source, destination, ...filters) {
  return bridge(ASYNC, source, destination, filters);
}

export function inlineBridge(source, destination, ...filters) {
  return bridge(INLINE, source, destination, filters);
}
