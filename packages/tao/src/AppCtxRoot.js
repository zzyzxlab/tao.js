import { WILDCARD } from './constants';

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
    return `${term}|${action}|${orient}`;
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

  get isTermWild() {
    return this._term === WILDCARD || !this._term.length;
  }

  get isActionWild() {
    return this._action === WILDCARD || !this._action.length;
  }

  get isOrientWild() {
    return this._orient === WILDCARD || !this._orient.length;
  }

  get isWildcard() {
    return this.isTermWild || this.isActionWild || this.isOrientWild;
  }

  get isConcrete() {
    return !this.isWildcard;
  }
}
