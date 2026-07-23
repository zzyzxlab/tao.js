import { Network } from '@tao.js/core';
import trigramFilter from './trigram-filter';

const NOOP = () => {};

function addControl(name, control) {
  return { ...control, seive: name };
}

// filter function signature: (ac:AppCtx, control:Object)
// filters is: [filterFunc, [exact,]] ...trigrams

/**
 * Forwards matching AppCons flowing on the `source`'s network into the
 * `destination` Channel's private network. Implemented as an `onDispatch`
 * decoration on the source network; chains from destination-channel
 * handlers continue the source cascade through the core hop engine.
 *
 * Clone-and-redirect: the destination entry carries a copy of the observed
 * cascade with a `{ seive: name }` tag added (the source cascade object is
 * never mutated), and passes the observed hop's `forward` continuation so
 * chained AppCons re-join the source cascade.
 *
 * @param {(string|number)} name - seive tag stamped on redirected cascades
 *        (`cascade.seive`) and used in the decoration's diagnostic name
 * @param {Kernel} source - Kernel-shaped wrapper whose `_network` is a
 *        `Network` to observe
 * @param {Channel} destination - Channel whose private network (`_channel`)
 *        receives the matching AppCons
 * @param {...*} filters - optional leading filter function
 *        `(ac: AppCtx, cascade: Object) => boolean`, then trigram filters as
 *        `trigramFilter` accepts (optional `exact` boolean, then short-key
 *        trigrams or a single array of trigrams)
 * @returns {function(): void} dispose - detaches the decoration (a no-op
 *          when `source`/`destination` are not the required shapes)
 */
export default function seive(name, source, destination, ...filters) {
  if (
    !source ||
    !(source._network instanceof Network) ||
    !destination ||
    !(destination._channel instanceof Network)
  ) {
    return NOOP;
  }
  let filterFunction =
    typeof filters[0] === 'function' ? filters.shift() : undefined;
  let handleFilter = trigramFilter(...filters);

  const undecorate = source._network.decorate({
    // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
    name: `seive:${name}`,
    onDispatch: (ac, envelope, handler, forward) => {
      if (filterFunction && !filterFunction(ac, envelope.cascade)) {
        return;
      }
      if (handleFilter(ac)) {
        destination._channel.enter(ac, {
          cascade: addControl(name, envelope.cascade),
          forward,
        });
      }
    },
  });
  return () => {
    undecorate();
    filterFunction = null;
    handleFilter = null;
  };
}
