import { AppCtx } from '@tao.js/core';

/**
 * Builds a predicate that tests whether a value is an `AppCtx` matching any
 * of the given trigrams (wildcard-aware via `AppCtx.isMatch`, which reads
 * short `t`/`a`/`o` keys only).
 *
 * @param {...*} trigrams - optional leading `exact` boolean (require exact
 *        key equality — wildcards only match wildcards), then trigram
 *        objects or a single array of trigrams; with none (or a leading
 *        `null`) the predicate matches any `AppCtx`
 * @returns {function(*): boolean} predicate over candidate AppCons
 */
export default function trigramFilter(...trigrams) {
  if (!trigrams.length || trigrams[0] == null) {
    return (ac) => ac instanceof AppCtx;
  }
  let exact = false;
  if (typeof trigrams[0] === 'boolean') {
    exact = trigrams.shift();
  }
  if (Array.isArray(trigrams[0])) {
    trigrams = trigrams[0];
  }
  return (ac) => {
    if (!(ac instanceof AppCtx)) {
      return false;
    }
    return trigrams.some((trigram) => ac.isMatch(trigram, exact));
  };
}
