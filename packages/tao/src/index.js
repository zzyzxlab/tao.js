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

// taken from http://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable
function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

// needed a convenience function for this
function concatIterables(...iterables) {
  const rv = [];
  if (iterables.length) {
    iterables.forEach(list => {
      if (list.length) {
        list.forEach(item => rv.concat(item));
      }
    });
  }
  return rv;
}

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

class AppCtxHandlers extends AppCtxRoot {
  constructor(term, action, orient, taoRoot, leafAppConHandlers) {
    super(term, action, orient);

    this._taoRoot = taoRoot;
    this._leafAppConHandlers = new Set(leafAppConHandlers);
    this._intercept = new Set();
    this._async = new Set();
    this._inline = new Set();
  }

  addLeafHandler(leafAch) {
    if (!(leafAch instanceof AppCtxHandlers)) {
      throw new Error("'leafAch' is not an instance of AppConHandlers");
    }
    if (!this.isWildcard || !leafAch.isConcrete) {
      return;
    }
    if (
      (this.isTermWild || this.t === leafAch.t) &&
      (this.isActionWild || this.a === leafAch.a) &&
      (this.isOrientWild || this.o === leafAch.o)
    ) {
      this._leafAppConHandlers.add(leafAch);
      this._intercept.forEach(inHandler =>
        leafAch.addInterceptHandler(inHandler)
      );
      this._async.forEach(aHandler => leafAch.addAsyncHandler(aHandler));
      this._inline.forEach(inHandler => leafAch.addInlineHandler(inHandler));
    }
  }

  addLeafHandlers(leafAches) {
    if (!isIterable(leafAches)) {
      this.addLeafHandler(leafAches);
    } else {
      for (let leaf of leafAches) {
        this.addLeafHandler(leaf);
      }
    }
  }

  addInterceptHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An InterceptHandler can only be a function');
    }
    this._intercept.add(handler);
    this._leafAppConHandlers.forEach(leafAch =>
      leafAch.addInterceptHandler(handler)
    );
  }

  removeInterceptHandler(handler) {
    this._intercept.delete(handler);
    this._leafAppConHandlers.forEach(leafAch =>
      leafAch.removeInterceptHandler(handler)
    );
  }

  addAsyncHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An AsyncHandler can only be a function');
    }
    this._async.add(handler);
    this._leafAppConHandlers.forEach(leafAch =>
      leafAch.addAsyncHandler(handler)
    );
  }

  removeAsyncHandler(handler) {
    this._async.delete(handler);
    this._leafAppConHandlers.forEach(leafAch =>
      leafAch.removeAsyncHandler(handler)
    );
  }

  addInlineHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An InlineHandler can only be a function');
    }
    this._inline.add(handler);
    this._leafAppConHandlers.forEach(leafAch =>
      leafAch.addInlineHandler(handler)
    );
  }

  removeInlineHandler(handler) {
    this._inline.delete(handler);
    this._leafAppConHandlers.forEach(leafAch =>
      leafAch.removeInlineHandler(handler)
    );
  }

  populateHandlersFromWildcards() {}

  get TAO() {
    return this._taoRoot;
  }

  get interceptHandlers() {
    if (this._intercept) {
      return this._intercept;
    }
  }

  get asyncHandlers() {
    return this._async;
  }

  get inlineHandlers() {
    return this._inline;
  }

  async handleAppCon(ac) {
    const { t, a, o, data } = ac;
    /*
     * Intercept Handlers
     * always occur first
     * have the ability to prevent other handlers from firing on this AC
     * optionally can return a single AC that will be set as the new AC instead of the incoming AC
     */
    for (let interceptH of this.interceptHandlers) {
      // using the decorator pattern to call these?
      let intercepted = interceptH({ t, a, o }, data);
      if (!intercepted) {
        continue;
      }
      if (intercepted instanceof AppCtx) {
        this.TAO.setAppCtx(intercepted);
      }
      return;
    }
    /*
     * Async Handlers
     * designed to kick off asynchronous handling of an AC outside of the current
     * control loop
     * fire if all Intercept Handlers don't intercept the fired AC
     * work inside of their own execution context
     * can return an AC that will be set as a context inside the async exec ctx
     * TODO: look into how redux-sagas is implemented and may be a way to use
     * generators instead of Promises
     * TODO: would ServiceWorkers make sense for this? tao-sw package
     */
    for (let asyncH of this.asyncHandlers) {
      (() => {
        console.log(
          `>>>>>>>> starting async context within ['${t}', '${a}', '${o}'] <<<<<<<<<<`
        );
        Promise.resolve(asyncH({ t, a, o }, data))
          .then(nextAc => {
            if (nextAc && nextAc instanceof AppCtx) {
              this.TAO.setAppCtx(nextAc);
            }
            console.log(
              `>>>>>>>> ending async context within ['${t}', '${a}', '${o}'] <<<<<<<<<<`
            );
          })
          .catch(error => {
            // swallow async errors
            // possibility to set an AC for errors
            console.error('error in async handler:', error);
          });
      })();
    }
    /*
     * Inline Handlers
     * fire if all Intercept Handlers don't intercept the fired AC
     * fired after all Async handlers are fired off
     * work inside the same execution context as the caller
     * can return an AC that will be set immediately in the TAO
     * TODO: should these returns be spooled up then iterated to allow
     * all handlers to handle this context before any new ones are set?
     * YES: currently implemented that way
     */
    const nextSpool = [];
    for (let inlineH of this.inlineHandlers) {
      let nextInlineAc = await inlineH({ t, a, o }, data);
      if (nextInlineAc && nextInlineAc instanceof AppCtx) {
        nextSpool.push(nextInlineAc);
      }
    }
    if (nextSpool.length) {
      for (let nextAc of nextSpool) {
        try {
          this.TAO.setAppCtx(nextAc);
        } catch (error) {
          console.error('error on next inline:', error);
        }
      }
    }
  }
}

const TAO = new TAORoot();
export { TAO };
