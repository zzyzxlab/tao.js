import { Network } from '@tao.js/core';
import trigramFilter from './trigram-filter';

const NOOP = () => {};

function addControl(name, control) {
  return { ...control, seive: name };
}

// filter function signature: (ac:AppCtx, control:Object)
// filters is: [filterFunc, [exact,]] ...trigrams

export default function seive(name, source, destination, ...filters) {
  if (
    !source ||
    !(source._network instanceof Network) ||
    !destination ||
    !(destination._network instanceof Network)
  ) {
    return NOOP;
  }
  let filterFunction =
    typeof filters[0] === 'function' ? filters.shift() : undefined;
  let handleFilter = trigramFilter(...filters);

  let middleware = (handler, ac, forwardAppCtx, control) => {
    if (filterFunction && !filterFunction(ac, control)) {
      return;
    }
    if (handleFilter(ac)) {
      destination._channel.setAppCtxControl(
        ac,
        addControl(name, control),
        forwardAppCtx
      );
    }
  };
  source._network.use(middleware);
  return () => {
    source._network.stop(middleware);
    middleware = null;
    filterFunction = null;
    handleFilter = null;
  };
}
