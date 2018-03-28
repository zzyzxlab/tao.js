import { clearTimeout } from 'timers';

// taken from http://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable
function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

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
  if (wildcardsFrom.has('*')) {
    wildcardsFrom.get('*').forEach(wc => wildcardsTo.add(wc));
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
  const t = term || '*';
  const a = action || '*';
  const o = orient || '*';
  const acKey = AppCtxRoot.getKey(t, a, o);
  if (taoHandlers.has(acKey)) {
    return taoHandlers.get(acKey);
  }
  const ach = new AppCtxHandlers(t, a, o, tao);

  if (ach.isWildcard) {
    let leaves = new Set();
    _appendLeaves(taoLeaves.t, leaves, term);
    // console.log(`leaves after TERM '${term}':`, leaves);
    _appendLeaves(taoLeaves.a, leaves, action);
    // console.log(`leaves after ACTION '${action}':`, leaves);
    _appendLeaves(taoLeaves.o, leaves, orient);
    // console.log(`leaves after ORIENT '${orient}':`, leaves);

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
  type = type || 'Inline';
  if (type !== 'Async' && type !== 'Inline' && type !== 'Intercept') {
    throw new Error(
      `${type} not a known handler type - try Async, Inline or Intercept`
    );
  }
  term = term || '*';
  action = action || '*';
  orient = orient || '*';
  const acKey = AppCtxRoot.getKey(term, action, orient);
  if (!taoHandlers.has(acKey)) {
    return;
  }
  taoHandlers.get(acKey)[`remove${type}Handler`](handler);
  return this;
}

function _removeHandlers(handlers, acList, tao) {
  handlers.forEach(handler =>
    acList.forEach(ac => tao.removeInlineHandler(ac, handler))
  );
}

function _hookHandler(tao, acList, promiseFn, timeoutHook) {
  let owner = this;
  if (!owner.handlers) {
    owner.handlers = [];
  }
  const acHandler = (tao, data) => {
    timeoutHook && timeoutHook();
    _removeHandlers(owner.handlers, acList, tao);
    promiseFn({ tao, data });
  };
  owner.handlers.push(acHandler);
  return acHandler;
}

class TAORoot {
  constructor(handlers) {
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
  }

  setContext({ t, a, o }, data) {
    // get the hash for the ac
    const acKey = AppCtxRoot.getKey(t, a, o);
    if (!this._handlers.has(acKey) && AppCtxRoot.isConcrete({ t, a, o })) {
      // console.log('in setContext, with:', { t, a, o, data, acKey });
      _addACHandler(this, this._handlers, this._leaves, this._wildcards, {
        term: t,
        action: a,
        orient: o
      });
      // this._addACHandler({ term: t, action: a, orient: o });
    }
    if (this._handlers.has(acKey)) {
      const ac = new AppCtx(t, a, o, data);
      this._handlers.get(acKey).handleAppCon(ac);
    }
  }

  setCtx(appCtx) {
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    if (!this._handlers.has(appCtx.key) && appCtx.isConcrete) {
      // console.log('in setCtx, with:', { appCtx });
      _addACHandler(this, this._handlers, this._leaves, this._wildcards, {
        term: appCtx.t,
        action: appCtx.a,
        orient: appCtx.o
      });
      // this._addACHandler({ term: appCtx.t, action: appCtx.a, orient: appCtx.o });
    }
    if (this._handlers.has(appCtx.key)) {
      this._handlers.get(appCtx.key).handleAppCon(appCtx);
    }
  }

  hook({ resolveOn, rejectOn }, timeoutMs = 0) {
    const resolvers = isIterable(resolveOn) ? resolveOn : [resolveOn];
    const rejectors = isIterable(rejectOn) ? rejectOn : [rejectOn];
    const allAcs = concatIterables(resolvers, rejectors);
    return ({ t, a, o }, data) =>
      new Promise((resolve, reject) => {
        let to = null;
        const clearTO = () => to && clearTimeout(to);
        const handlerOwner = {};
        const resolveHandler = _hookHandler.call(
          handlerOwner,
          this,
          allAcs,
          resolve,
          clearTO
        );
        resolvers.forEach(ac => this.addInlineHandler(ac, resolveHandler));
        const rejectHandler = _hookHandler.call(
          handlerOwner,
          this,
          allAcs,
          reject,
          clearTO
        );
        rejectors.forEach(ac => this.addInlineHandler(ac, rejectHandler));
        if (timeoutMs > 0) {
          to = setTimeout(() => {
            _removeHandlers(handlerOwner.handlers, allAcs, this);
            reject('timeout');
          }, timeoutMs);
        }
        this.setContext({ t, a, o }, data);
      });
  }

  // setInterceptHandler({ term, action, orient }, handler, overwrite = false) {
  //     if (!handler) {
  //         throw new Error('cannot add empty handler');
  //     }
  //     const ach = _addACHandler(this, this._handlers, this._leaves,
  //         this._wildcards, { term, action, orient });
  //     ach.setInterceptHandler(handler, overwrite);
  //     return this;
  // }

  addInterceptHandler({ term, action, orient }, handler) {
    if (!handler) {
      throw new Error('cannot add empty handler');
    }
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      { term, action, orient }
    );
    ach.addInterceptHandler(handler);
    return this;
  }

  addAsyncHandler({ term, action, orient }, handler) {
    if (!handler) {
      throw new Error('cannot add empty handler');
    }
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      { term, action, orient }
    );
    ach.addAsyncHandler(handler);
    return this;
  }

  addInlineHandler({ term, action, orient }, handler) {
    if (!handler) {
      throw new Error('cannot add empty handler');
    }
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      { term, action, orient }
    );
    ach.addInlineHandler(handler);
    return this;
  }

  removeInterceptHandler({ term, action, orient }, handler) {
    return _removeHandler(
      this._handlers,
      { term, action, orient },
      handler,
      'Intercept'
    );
  }

  removeAsyncHandler({ term, action, orient }, handler) {
    return _removeHandler(
      this._handlers,
      { term, action, orient },
      handler,
      'Async'
    );
  }

  removeInlineHandler({ term, action, orient }, handler) {
    return _removeHandler(
      this._handlers,
      { term, action, orient },
      handler,
      'Inline'
    );
  }
}

class AppCtxRoot {
  constructor(term, action, orient) {
    this._term = term || '*';
    this._action = action || '*';
    this._orient = orient || '*';
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

  static isWildcard({ t, a, o }) {
    return (
      !t ||
      !a ||
      !o ||
      !t.length ||
      !a.length ||
      !o.length ||
      t === '*' ||
      a === '*' ||
      o === '*'
    );
  }

  static isConcrete({ t, a, o }) {
    return !AppCtxRoot.isWildcard({ t, a, o });
  }

  get isTermWild() {
    return this._term === '*' || !this._term.length;
  }

  get isActionWild() {
    return this._action === '*' || !this._action.length;
  }

  get isOrientWild() {
    return this._orient === '*' || !this._orient.length;
  }

  get isWildcard() {
    return this.isTermWild || this.isActionWild || this.isOrientWild;
  }

  get isConcrete() {
    return !this.isWildcard;
  }
}

export class AppCtx extends AppCtxRoot {
  constructor(term, action, orient, ...data) {
    super(term, action, orient);
    // TODO: figure out how to deal with associated AppCon data
    if (data.length) {
      if (data.length === 1) {
        // attempt to infer object
        let datum = {};
        let assigned = false;
        if (data[0].term) {
          datum[term] = data[0].term;
          assigned = true;
        } else if (data[0][term]) {
          datum[term] = data[0][term];
          assigned = true;
        }
        if (data[0].action) {
          datum[action] = data[0].action;
          assigned = true;
        } else if (data[0][action]) {
          datum[action] = data[0][action];
          assigned = true;
        }
        if (data[0].orient) {
          datum[orient] = data[0].orient;
          assigned = true;
        } else if (data[0][orient]) {
          datum[orient] = data[0][orient];
          assigned = true;
        }
        if (assigned) {
          this.datum = datum;
        }
      }
      if (!this.datum) {
        // assume tuple
        this.datum = {
          [term]: data[0],
          [action]: data[1],
          [orient]: data[2]
        };
      }
    } else {
      this.datum = {};
    }
  }

  get data() {
    return this.datum;
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
      // if (this._intercept) {
      //     // TODO: figure out how to handle intercept handler from wildcard to leaves
      //     // FOR NOW: setting the intercept without overwrite
      //     leafAch.setInterceptHandler(this._intercept, false);
      // }
      this._intercept.forEach(inHandler =>
        leafAch.addInterceptHandler(inHandler)
      );
      this._async.forEach(aHandler => leafAch.addAsyncHandler(aHandler));
      this._inline.forEach(inHandler => leafAch.addInlineHandler(inHandler));
    }
  }

  addLeafHandlers(leafAches) {
    // console.log('add set of leaf handlers from:', leafAches);
    if (!isIterable(leafAches)) {
      // console.log('convinced not iterable');
      this.addLeafHandler(leafAches);
    } else {
      // console.log('oh its iterable');
      for (let leaf of leafAches) {
        // console.log('here is the leaf Im adding:', leaf);
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

  // setInterceptHandler(handler, overwrite = false) {
  //     if (typeof handler !== 'function') {
  //         throw new Error('An InterceptHandler can only be a function');
  //     }
  //     const oldIntercepts = new Set();
  //     const prevIntercept = this._intercept;
  //     if (!this._intercept || overwrite) {
  //         this._intercept = handler;
  //     }
  //     if (prevIntercept && (prevIntercept !== handler)) {
  //         oldIntercepts.add(prevIntercept);
  //     }
  //     if (this._leafAppConHandlers.size) {
  //         for (let leafAch of this._leafAppConHandlers) {
  //             oldIntercepts.add(leafAch.setInterceptHandler(handler, overwrite));
  //         }
  //     }
  //     return oldIntercepts;
  // }

  // removeInterceptHandler(handler) {
  //     // TODO: figure out intercept handler hierarchy and how to remove
  // }

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
    // TODO: figure out how to traverse wildcard handlers to find the single intercept to use
  }

  get asyncHandlers() {
    return this._async;
  }

  get inlineHandlers() {
    return this._inline;
  }

  async handleAppCon(ac) {
    // const intercept = this.interceptHandlers;
    const { t, a, o } = ac;
    // const tao = { t: ac.term, a: ac.action, o: ac.orient };
    // if (intercept && intercept({ t, a, o }, ac.data)) {
    //     return;
    // }
    /*
     * Intercept Handlers
     * always occur first
     * have the ability to prevent other handlers from firing on this AC
     * optionally can return a single AC that will be set as the new AC instead of the incoming AC
     */
    for (let interceptH of this.interceptHandlers) {
      // using the decorator pattern to call these?
      let intercepted = interceptH({ t, a, o }, ac.datum);
      if (!intercepted) {
        continue;
      }
      if (intercepted instanceof AppCtx) {
        this.TAO.setCtx(intercepted);
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
        Promise.resolve(asyncH({ t, a, o }, ac.datum))
          .then(nextAc => {
            if (nextAc) {
              this.TAO.setCtx(nextAc);
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
      // let nextInlineAc = await inlineH({ t, a, o }, ac.datum);
      let nextInlineAc = await inlineH({ t, a, o }, ac.datum);
      nextInlineAc && nextSpool.push(nextInlineAc);
    }
    if (nextSpool.length) {
      for (let nextAc of nextSpool) {
        // nextSpool.forEach(nextAc => {
        try {
          this.TAO.setCtx(nextAc);
        } catch (error) {
          console.error('error on next inline:', error);
        }
        // });
      }
    }
  }
}

const TAO = new TAORoot();
export { TAO };
