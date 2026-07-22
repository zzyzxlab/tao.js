import Network from './Network';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import { _cleanAC } from './utils';

export default class Kernel {
  constructor(canSetWildcard = false) {
    this._network = new Network(canSetWildcard);
    this._canSetWildcard = canSetWildcard;
  }

  get canSetWildcard() {
    return this._canSetWildcard;
  }

  clone(canSetWildcard) {
    const cloned = new Kernel(
      typeof canSetWildcard !== 'undefined'
        ? canSetWildcard
        : this._canSetWildcard,
    );
    cloned._network = this._network.clone();
    return cloned;
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    // get the hash for the ac
    const acIn = _cleanAC({ t, term, a, action, o, orient });
    const isWild = AppCtxRoot.isWildcard(acIn);
    if (!this._canSetWildcard && isWild) {
      // Ignore or Throw Error?
      return;
    }
    this._network.enter(new AppCtx(acIn.term, acIn.action, acIn.orient, data));
  }

  setAppCtx(appCtx) {
    // Stryker disable next-line all: Network.enter throws the same error
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    const isWild = appCtx.isWildcard;
    if (!this._canSetWildcard && isWild) {
      // Ignore or Throw Error?
      return;
    }
    this._network.enter(appCtx);
  }

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._network.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._network.addAsyncHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._network.addInlineHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }
}
