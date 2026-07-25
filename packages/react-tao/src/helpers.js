import cartesian from 'cartesian';

/** @typedef {import('@tao.js/core').Trigram} Trigram */

/**
 * One part of a trigram prop: a single value or an array of values (arrays
 * expand to every combination via cartesian product). A missing, empty, or
 * `'*'` part is a wildcard.
 * @typedef {string|string[]} TrigramPart
 */

/**
 * Trigram props accepted by @tao.js/react components and hooks: short
 * (`t`/`a`/`o`) and long (`term`/`action`/`orient`) keys are interchangeable
 * (long keys win when both are given for the same part), values may be
 * arrays to match multiple trigrams, and missing parts are wildcards.
 * @typedef {Object} TrigramProps
 * @property {TrigramPart} [t] - the term (short key)
 * @property {TrigramPart} [term] - the term: the domain thing
 * @property {TrigramPart} [a] - the action (short key)
 * @property {TrigramPart} [action] - the action: the operation on the term
 * @property {TrigramPart} [o] - the orient (short key)
 * @property {TrigramPart} [orient] - the orient: perspective / role / surface
 */

/**
 * A normalized long-key trigram: only present parts, each still possibly an
 * array (multi-match) — the cleaned form used for permutation + hashing.
 * @typedef {Object} NormalizedTrigram
 * @property {TrigramPart} [term]
 * @property {TrigramPart} [action]
 * @property {TrigramPart} [orient]
 */

/**
 * The concrete trigram a handler receives when an AppCon dispatches
 * (always short keys, always concrete strings).
 * @typedef {Object} TaoSignal
 * @property {string} t - the term
 * @property {string} a - the action
 * @property {string} o - the orient
 */

/** No-op placeholder function. */
export const noop = () => {};

/**
 * Normalize short/long trigram keys to long keys (long keys win when both
 * styles are present for the same part).
 * @param {TrigramProps} trigramProps
 * @returns {NormalizedTrigram}
 */
export function normalizeAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o,
  };
}

/**
 * Drop nullish parts from a long-key trigram (missing parts = wildcards).
 * @param {NormalizedTrigram} trigram
 * @returns {NormalizedTrigram}
 */
export function cleanInput({ term, action, orient }) {
  const incoming = { term, action, orient };
  Object.keys(incoming).forEach(
    (k) => incoming[k] == null && delete incoming[k],
  );
  return incoming;
}

/**
 * Normalize trigram props to cleaned long keys (see {@link normalizeAC} +
 * {@link cleanInput}).
 * @param {TrigramProps} trigramProps
 * @returns {NormalizedTrigram}
 */
export function normalizeClean({ t, term, a, action, o, orient }) {
  return cleanInput(normalizeAC({ t, term, a, action, o, orient }));
}

/**
 * Expand trigram props into concrete single-valued trigram permutations
 * (cartesian product of any array parts). Returns `[{}]` — one all-wildcard
 * trigram — when no parts are given, so subscriptions still register.
 * @param {TrigramProps} trigramProps
 * @returns {Trigram[]}
 */
export function getPermutations({ t, term, a, action, o, orient }) {
  const trigram = normalizeClean({ t, term, a, action, o, orient });
  const permutations = cartesian(trigram);
  if (permutations.length) {
    return permutations;
  }
  return [{}];
}

/**
 * @param {TrigramPart} [trigram] - one part (missing = `'%'` marker)
 * @returns {string}
 */
function trigramHash(trigram) {
  return !trigram ? '%' : Array.isArray(trigram) ? trigram.join(',') : trigram;
}

/**
 * Stable identity key for a (possibly multi-valued) trigram spec — used by
 * SwitchHandler to match chosen RenderHandler children across renders.
 * @param {NormalizedTrigram} trigram
 * @returns {string}
 */
export function handlerHash({ term, action, orient }) {
  return `${trigramHash(term)}|${trigramHash(action)}|${trigramHash(orient)}`;
}

/**
 * Stable dep key for Kernel subscription lists (arrays, order).
 * @param {object[]} [trigrams]
 * @returns {string}
 */
export function serializeTrigrams(trigrams) {
  return JSON.stringify(trigrams || []);
}
