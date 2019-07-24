// need this when running in Node.js environment
import { clearTimeout } from 'timers';
import {
  // WILDCARD,
  // INTERCEPT,
  // ASYNC,
  INLINE,
  TIMEOUT_REJECT
} from './constants';
import Network from './Network';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
// import AppCtxHandlers from './AppCtxHandlers';
import { isIterable, concatIterables, _cleanAC } from './utils';

function _removeHandlers(network, acList, handlers, type) {
  handlers.forEach(handler =>
    acList.forEach(ac => network.removeHandler(ac, handler, type))
  );
}

function _createPromiseHandler(
  network,
  acList,
  promiseFn,
  timeoutHook,
  handlerType
) {
  let owner = this;
  if (!owner.handlers) {
    owner.handlers = [];
  }
  const acHandler = (ac, data) => {
    timeoutHook && timeoutHook();
    _removeHandlers(network, acList, owner.handlers, handlerType);
    promiseFn({ tao: ac, data });
  };
  owner.handlers.push(acHandler);
  return acHandler;
}

export default class Kernel {
  constructor(canSetWildcard = false) {
    this._network = new Network();
    this._network.use(this.handleAppCon);
    this._canSetWildcard = canSetWildcard;
  }

  get canSetWildcard() {
    return this._canSetWildcard;
  }

  clone(canSetWildcard) {
    const cloned = new Kernel(
      typeof canSetWildcard !== 'undefined'
        ? canSetWildcard
        : this._canSetWildcard
    );
    cloned._network = this._network.clone();
    return cloned;
  }

  /**
   * What if a Channel is a separate thing that operates a Kernel and uses bridges to the
   * main signal network which is the Kernel from which the Channel is made?
   *
   * @returns
   * @memberof Kernel
   */
  channel(id, bridge) {
    const network = this;
    const channel = new Kernel();
    // QQQ: does this mean Kernel has to keep track of all bridges?
    let debridge = network.inlineBridge(
      channel,
      control => control.channelId === id,
      bridge
    );
    return {
      setCtx({ t, a, o }, data) {
        network.setAppCtxControl(new AppCtx(t, a, o, data), { channelId: id });
      },
      dispose() {
        debridge();
      }
    };

    // const channelled = new Kernel();
    // channelled._handlers = this._handlers;
    // channelled._leaves = this._leaves;
    // channelled._wildcards = this._wildcards;
    // channelled._canSetWildcard = this._canSetWildcard;
    // return channelled;
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    // get the hash for the ac
    const acIn = _cleanAC({ t, term, a, action, o, orient });
    const isWild = AppCtxRoot.isWildcard(acIn);
    if (!this._canSetWildcard && isWild) {
      // Ignore or Throw Error?
      return;
    }
    this._network.setCtxControl(acIn, data, {}, (ac, control) =>
      this.forwardAppCtx(ac, control)
    );
  }

  setAppCtx(appCtx) {
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    const isWild = appCtx.isWildcard;
    if (!this._canSetWildcard && isWild) {
      // Ignore or Throw Error?
      return;
    }
    this._network.setAppCtxControl(appCtx, {}, (ac, control) =>
      this.forwardAppCtx(ac, control)
    );
  }

  forwardAppCtx(ac, control) {
    this.setAppCtx(ac, control);
  }

  handleAppCon(handler, ac, forwardAppCtx, control) {
    return handler.handleAppCon(ac, forwardAppCtx, control);
  }

  asPromiseHook({ resolveOn = [], rejectOn = [] }, timeoutMs = 0) {
    // return this._network.asPromiseHook({ resolveOn, rejectOn }, timeoutMs);
    const resolvers = isIterable(resolveOn)
      ? resolveOn
      : resolveOn
      ? [resolveOn]
      : [];
    const rejectors = isIterable(rejectOn)
      ? rejectOn
      : rejectOn
      ? [rejectOn]
      : [];
    if (
      !resolvers.length &&
      !resolvers.size &&
      !rejectors.length &&
      !rejectors.size
    ) {
      throw new Error(
        'asPromiseHook must be provided with a way to settle the Promise: `resolveOn` or `rejectOn` must have a value'
      );
    }
    const allAcs = concatIterables(resolvers, rejectors);
    return ({ t, term, a, action, o, orient }, data) =>
      new Promise((resolve, reject) => {
        let to = null;
        const clearTO = () => to && clearTimeout(to);
        const handlerOwner = {};
        const resolveHandler = _createPromiseHandler.call(
          handlerOwner,
          this._network,
          allAcs,
          resolve,
          clearTO,
          INLINE
        );
        resolvers.forEach(ac => this.addInlineHandler(ac, resolveHandler));
        const rejectHandler = _createPromiseHandler.call(
          handlerOwner,
          this._network,
          allAcs,
          reject,
          clearTO,
          INLINE
        );
        rejectors.forEach(ac => this.addInlineHandler(ac, rejectHandler));
        if (timeoutMs > 0) {
          to = setTimeout(() => {
            _removeHandlers(
              this._network,
              allAcs,
              handlerOwner.handlers,
              INLINE
            );
            reject(TIMEOUT_REJECT);
          }, timeoutMs);
        }
        this.setCtx({ t, term, a, action, o, orient }, data);
      });
  }

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._network.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler
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
      handler
    );
    return this;
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler
    );
    return this;
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler
    );
    return this;
  }
}
