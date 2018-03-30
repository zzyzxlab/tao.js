// need this when running in Node.js environment
import { clearTimeout } from 'timers';
import {
  WILDCARD,
  INTERCEPT,
  ASYNC,
  INLINE,
  TIMEOUT_REJECT
} from './constants';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import AppCtxHandlers from './AppCtxHandlers';
import { isIterable, concatIterables } from './utils';

// Private methods for TAO
function _cleanAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o
  };
}

function _appendLeaves(leavesFrom, leavesTo, taoism) {
  if (taoism) {
    if (leavesFrom.has(taoism) && leavesFrom.get(taoism).size) {
      leavesFrom.get(taoism).forEach(leaf => leavesTo.add(leaf));
    }
  } else {
    leavesFrom.forEach(leaves => {
      leaves.forEach(leaf => leavesTo.add(leaf));
    });
  }
}

function _appendWildcards(wildcardsFrom, wildcardsTo, taoism) {
  if (wildcardsFrom.has(taoism)) {
    wildcardsFrom.get(taoism).forEach(wc => wildcardsTo.add(wc));
  }
  if (wildcardsFrom.has(WILDCARD)) {
    wildcardsFrom.get(WILDCARD).forEach(wc => wildcardsTo.add(wc));
  }
}

function _addLeaf(leaves, taoism, ach) {
  if (!leaves.has(taoism)) {
    leaves.set(taoism, new Set());
  }
  leaves.get(taoism).add(ach);
}

function _addWildcard(wildcards, taoism, ach) {
  if (!wildcards.has(taoism)) {
    wildcards.set(taoism, new Set());
  }
  wildcards.get(taoism).add(ach);
}

function _addACHandler(
  tao,
  taoHandlers,
  taoLeaves,
  taoWildcards,
  { term, action, orient }
) {
  const t = term || WILDCARD;
  const a = action || WILDCARD;
  const o = orient || WILDCARD;
  const acKey = AppCtxRoot.getKey(t, a, o);
  if (taoHandlers.has(acKey)) {
    return taoHandlers.get(acKey);
  }
  const ach = new AppCtxHandlers(t, a, o, tao);

  if (ach.isWildcard) {
    let leaves = new Set();
    _appendLeaves(taoLeaves.t, leaves, term);
    _appendLeaves(taoLeaves.a, leaves, action);
    _appendLeaves(taoLeaves.o, leaves, orient);

    ach.addLeafHandlers(leaves);

    _addWildcard(taoWildcards.t, t, ach);
    _addWildcard(taoWildcards.a, a, ach);
    _addWildcard(taoWildcards.o, o, ach);
  } else {
    //!ach.isWildcard
    _addLeaf(taoLeaves.t, term, ach);
    _addLeaf(taoLeaves.a, action, ach);
    _addLeaf(taoLeaves.o, orient, ach);

    let wildcards = new Set();
    _appendWildcards(taoWildcards.t, wildcards, term);
    _appendWildcards(taoWildcards.a, wildcards, action);
    _appendWildcards(taoWildcards.o, wildcards, orient);
    for (let wc of wildcards) {
      wc.addLeafHandler(ach);
    }
  }
  taoHandlers.set(acKey, ach);
  return ach;
}

function _removeHandler(taoHandlers, { term, action, orient }, handler, type) {
  if (!handler) {
    throw new Error('cannot remove empty handler');
  }
  type = type || INLINE;
  if (type !== ASYNC && type !== INLINE && type !== INTERCEPT) {
    throw new Error(
      `${type} not a known handler type - try ${ASYNC}, ${INLINE} or ${INTERCEPT}`
    );
  }
  const t = term || WILDCARD;
  const a = action || WILDCARD;
  const o = orient || WILDCARD;
  const acKey = AppCtxRoot.getKey(t, a, o);
  if (!taoHandlers.has(acKey)) {
    return;
  }
  taoHandlers.get(acKey)[`remove${type}Handler`](handler);
  return this;
}

function _removeHandlers(taoHandlers, acList, handlers, type) {
  handlers.forEach(handler =>
    acList.forEach(ac =>
      _removeHandler(taoHandlers, _cleanAC(ac), handler, type)
    )
  );
}

// function _removeHookHandlers(handlers, acList, tao) {
//   handlers.forEach(handler =>
//     acList.forEach(ac => tao.removeInlineHandler(ac, handler))
//   );
// }

function _createPromiseHandler(
  taoHandlers,
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
    _removeHandlers(taoHandlers, acList, owner.handlers, handlerType);
    promiseFn({ tao: ac, data });
  };
  owner.handlers.push(acHandler);
  return acHandler;
}

class TAORoot {
  constructor(handlers, canSetWildcard = false) {
    this._handlers = handlers || new Map();
    this._leaves = {
      t: new Map(),
      a: new Map(),
      o: new Map()
    };
    this._wildcards = {
      t: new Map(),
      a: new Map(),
      o: new Map()
    };
    this._canSetWildcard = canSetWildcard;
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    // get the hash for the ac
    const acIn = _cleanAC({ t, term, a, action, o, orient });
    const isWild = AppCtxRoot.isWildcard(acIn);
    if (!this._canSetWildcard && isWild) {
      // Ignore or Throw Error?
      return;
    }
    const acKey = AppCtxRoot.getKey(acIn.term, acIn.action, acIn.orient);
    if (!this._handlers.has(acKey) && !isWild) {
      _addACHandler(this, this._handlers, this._leaves, this._wildcards, acIn);
    }
    if (this._handlers.has(acKey)) {
      const ac = new AppCtx(acIn.term, acIn.action, acIn.orient, data);
      // why not forward the call to setAppCtx? -> b/c don't want to execute check against existing again
      this._handlers.get(acKey).handleAppCon(ac);
    }
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
    if (!this._handlers.has(appCtx.key) && !isWild) {
      _addACHandler(
        this,
        this._handlers,
        this._leaves,
        this._wildcards,
        _cleanAC(appCtx)
      );
    }
    if (this._handlers.has(appCtx.key)) {
      this._handlers.get(appCtx.key).handleAppCon(appCtx);
    }
  }

  asPromiseHook({ resolveOn, rejectOn }, timeoutMs = 0) {
    const resolvers = isIterable(resolveOn) ? resolveOn : [resolveOn];
    const rejectors = isIterable(rejectOn) ? rejectOn : [rejectOn];
    const allAcs = concatIterables(resolvers, rejectors);
    return ({ t, a, o }, data) =>
      new Promise((resolve, reject) => {
        let to = null;
        const clearTO = () => to && clearTimeout(to);
        const handlerOwner = {};
        const resolveHandler = _createPromiseHandler.call(
          handlerOwner,
          this._handlers,
          allAcs,
          resolve,
          clearTO,
          INLINE
        );
        resolvers.forEach(ac => this.addInlineHandler(ac, resolveHandler));
        const rejectHandler = _createPromiseHandler.call(
          handlerOwner,
          this._handlers,
          allAcs,
          reject,
          clearTO,
          INLINE
        );
        rejectors.forEach(ac => this.addInlineHandler(ac, rejectHandler));
        if (timeoutMs > 0) {
          to = setTimeout(() => {
            _removeHandlers(
              this._handlers,
              allAcs,
              handlerOwner.handlers,
              INLINE
            );
            reject(TIMEOUT_REJECT);
          }, timeoutMs);
        }
        this.setCtx({ t, a, o }, data);
      });
  }

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    if (!handler) {
      throw new Error('cannot add empty handler');
    }
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      _cleanAC({ t, term, a, action, o, orient })
    );
    ach.addInterceptHandler(handler);
    return this;
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    if (!handler) {
      throw new Error('cannot add empty handler');
    }
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      _cleanAC({ t, term, a, action, o, orient })
    );
    ach.addAsyncHandler(handler);
    return this;
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    if (!handler) {
      throw new Error('cannot add empty handler');
    }
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      _cleanAC({ t, term, a, action, o, orient })
    );
    ach.addInlineHandler(handler);
    return this;
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    return _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      INTERCEPT
    );
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    return _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      ASYNC
    );
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    return _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      INLINE
    );
  }
}

const TAO = new TAORoot();
export { TAO };
