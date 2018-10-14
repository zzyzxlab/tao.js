import { WILDCARD } from './constants';

function isPartWild(val) {
  return !val || WILDCARD === val;
}

export default class AppCtxRoot {
  constructor(term, action, orient) {
    this._term = term || WILDCARD;
    this._action = action || WILDCARD;
    this._orient = orient || WILDCARD;
  }

  get key() {
    return AppCtxRoot.getKey(this._term, this._action, this._orient);
  }

  get t() {
    return this._term;
  }

  get a() {
    return this._action;
  }

  get o() {
    return this._orient;
  }

  static getKey(term, action, orient) {
    return `${term || WILDCARD}|${action || WILDCARD}|${orient || WILDCARD}`;
  }

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

  static isConcrete(ac = {}) {
    return !AppCtxRoot.isWildcard(ac);
  }

  // TODO: write TESTS for this
  static isMatch(ac, trigram, exact = false) {
    if (!(ac instanceof AppCtxRoot)) {
      ac = new AppCtxRoot(
        ac.t || ac.term,
        ac.a || ac.action,
        ac.o || ac.orient
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

  get isTermWild() {
    return isPartWild(this._term);
  }

  get isActionWild() {
    return isPartWild(this._action);
  }

  get isOrientWild() {
    return isPartWild(this._orient);
  }

  get isWildcard() {
    return this.isTermWild || this.isActionWild || this.isOrientWild;
  }

  get isConcrete() {
    return !this.isWildcard;
  }

  isMatch(trigram, exact = false) {
    return AppCtxRoot.isMatch(this, trigram, exact);
  }
}
