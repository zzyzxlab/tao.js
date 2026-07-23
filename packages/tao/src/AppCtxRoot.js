import { WILDCARD } from './constants';

/**
 * A trigram names an Application Context: the thing (term), the operation on
 * it (action), and the perspective of the interaction (orient). Short
 * (`t`/`a`/`o`) and long (`term`/`action`/`orient`) keys are interchangeable
 * — supply one style per part. A missing, empty, or `'*'` part is a wildcard.
 *
 * @typedef {Object} Trigram
 * @property {string} [t] - the term (short key)
 * @property {string} [term] - the term: the domain thing
 * @property {string} [a] - the action (short key)
 * @property {string} [action] - the action: the operation on the term
 * @property {string} [o] - the orient (short key)
 * @property {string} [orient] - the orient: perspective / role / surface
 */

/**
 * Whether a single trigram part is wild (missing, empty, or the WILDCARD).
 * @param {string} [val] - the trigram part
 * @returns {boolean}
 */
function isPartWild(val) {
  return !val || WILDCARD === val;
}

/**
 * Base of the trigram-keyed classes: holds the three parts (missing parts
 * become WILDCARD) and answers wildcard / matching questions. Key format:
 * `` `${term}|${action}|${orient}` ``.
 */
export default class AppCtxRoot {
  /**
   * @param {string} [term] - the term (missing = WILDCARD)
   * @param {string} [action] - the action (missing = WILDCARD)
   * @param {string} [orient] - the orient (missing = WILDCARD)
   */
  constructor(term, action, orient) {
    this._term = term || WILDCARD;
    this._action = action || WILDCARD;
    this._orient = orient || WILDCARD;
  }

  /** The `term|action|orient` key for this trigram. @returns {string} */
  get key() {
    return AppCtxRoot.getKey(this._term, this._action, this._orient);
  }

  /** The term. @returns {string} */
  get t() {
    return this._term;
  }

  /** The action. @returns {string} */
  get a() {
    return this._action;
  }

  /** The orient. @returns {string} */
  get o() {
    return this._orient;
  }

  /**
   * Build the `term|action|orient` key; missing parts become WILDCARD.
   * @param {string} [term]
   * @param {string} [action]
   * @param {string} [orient]
   * @returns {string}
   */
  static getKey(term, action, orient) {
    return `${term || WILDCARD}|${action || WILDCARD}|${orient || WILDCARD}`;
  }

  /**
   * Whether any part of a trigram is wild (missing, empty, or WILDCARD).
   * Both key styles are accepted; short keys win when both are present.
   * @param {Trigram} [ac]
   * @returns {boolean}
   */
  // static isWildcard({ term = WILDCARD, action = WILDCARD, orient = WILDCARD } = {}) {
  static isWildcard(ac = {}) {
    const { t, term, a, action, o, orient } = ac;
    const checkT = t || term;
    const checkA = a || action;
    const checkO = o || orient;
    return (
      !checkT ||
      !checkA ||
      !checkO ||
      !checkT.length ||
      !checkA.length ||
      !checkO.length ||
      checkT === WILDCARD ||
      checkA === WILDCARD ||
      checkO === WILDCARD
    );
  }

  /**
   * Whether every part of a trigram is concrete (no wildcards).
   * @param {Trigram} [ac]
   * @returns {boolean}
   */
  static isConcrete(ac = {}) {
    return !AppCtxRoot.isWildcard(ac);
  }

  /**
   * Whether an AppCtx(-like) matches a trigram, honoring wildcards on both
   * sides unless `exact`. NOTE: `trigram` is read with short keys
   * (`t`/`a`/`o`) only — long keys are not consulted here, so a
   * long-key-only trigram is treated as all-wild.
   *
   * @param {AppCtxRoot|Trigram} ac - the context being tested (both key styles accepted)
   * @param {{t: (string|undefined), a: (string|undefined), o: (string|undefined)}} trigram - the trigram to match against (short keys only)
   * @param {boolean} [exact=false] - require exact key equality (wildcards only match wildcards)
   * @returns {boolean}
   */
  // TODO: write TESTS for this
  static isMatch(ac, trigram, exact = false) {
    // Stryker disable next-line ConditionalExpression: re-wrapping an AppCtxRoot is observationally identical
    if (!(ac instanceof AppCtxRoot)) {
      ac = new AppCtxRoot(
        ac.t || ac.term,
        ac.a || ac.action,
        ac.o || ac.orient,
      );
    }
    if (ac.key === AppCtxRoot.getKey(trigram.t, trigram.a, trigram.o)) {
      return true;
    }
    if (exact) {
      return false;
    }
    const matchTerm =
      ac.isTermWild || isPartWild(trigram.t) || ac.t === trigram.t;
    const matchAction =
      ac.isActionWild || isPartWild(trigram.a) || ac.a === trigram.a;
    const matchOrient =
      ac.isOrientWild || isPartWild(trigram.o) || ac.o === trigram.o;
    return matchTerm && matchAction && matchOrient;
  }

  /** Whether the term is wild. @returns {boolean} */
  get isTermWild() {
    return isPartWild(this._term);
  }

  /** Whether the action is wild. @returns {boolean} */
  get isActionWild() {
    return isPartWild(this._action);
  }

  /** Whether the orient is wild. @returns {boolean} */
  get isOrientWild() {
    return isPartWild(this._orient);
  }

  /** Whether any part is wild. @returns {boolean} */
  get isWildcard() {
    return this.isTermWild || this.isActionWild || this.isOrientWild;
  }

  /** Whether every part is concrete. @returns {boolean} */
  get isConcrete() {
    return !this.isWildcard;
  }

  /**
   * Instance form of {@link AppCtxRoot.isMatch} with this as the context.
   * @param {{t: (string|undefined), a: (string|undefined), o: (string|undefined)}} trigram - the trigram to match against (short keys only)
   * @param {boolean} [exact=false]
   * @returns {boolean}
   */
  isMatch(trigram, exact = false) {
    return AppCtxRoot.isMatch(this, trigram, exact);
  }
}
