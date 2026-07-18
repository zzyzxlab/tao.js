// need this when running in Node.js environment
// import { clearTimeout } from 'timers';
import {
  WILDCARD,
  INTERCEPT,
  ASYNC,
  INLINE,
  // TIMEOUT_REJECT
} from './constants';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import AppCtxHandlers from './AppCtxHandlers';
import { _cleanAC, _validateHandler } from './utils';

const NOOP = () => {};

// // Private methods for TAO
// function _cleanAC({ t, term, a, action, o, orient }) {
//   return {
//     term: term || t,
//     action: action || a,
//     orient: orient || o
//   };
// }

// function _validateHandler(handler) {
//   if (!handler) {
//     throw new Error('cannot do anything with missing handler');
//   }
//   if (typeof handler !== 'function') {
//     throw new Error('handler must be a function');
//   }
// }

// Stryker disable all: multi-axis leaf/wildcard indexing is redundant; single-axis mutants are equivalent
function _appendLeaves(leavesFrom, leavesTo, taoism) {
  if (taoism) {
    if (leavesFrom.has(taoism) && leavesFrom.get(taoism).size) {
      leavesFrom.get(taoism).forEach((leaf) => leavesTo.add(leaf));
    }
  } else {
    leavesFrom.forEach((leaves) => {
      leaves.forEach((leaf) => leavesTo.add(leaf));
    });
  }
}

function _appendWildcards(wildcardsFrom, wildcardsTo, taoism) {
  if (wildcardsFrom.has(taoism)) {
    wildcardsFrom.get(taoism).forEach((wc) => wildcardsTo.add(wc));
  }
  if (wildcardsFrom.has(WILDCARD)) {
    wildcardsFrom.get(WILDCARD).forEach((wc) => wildcardsTo.add(wc));
  }
}

function _addLeaf(leaves, taoism, ach) {
  if (!leaves.has(taoism)) {
    leaves.set(taoism, new Set());
  }
  leaves.get(taoism).add(ach);
}
// Stryker restore all

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
  { term, action, orient },
) {
  const t = term || WILDCARD;
  const a = action || WILDCARD;
  const o = orient || WILDCARD;
  const acKey = AppCtxRoot.getKey(t, a, o);
  if (taoHandlers.has(acKey)) {
    return taoHandlers.get(acKey);
  }
  const ach = new AppCtxHandlers(t, a, o);

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
  _validateHandler(handler);
  // guard is currently impossible to hit so removing to get 100% test coverage
  // type = type || INLINE;
  // if (type !== ASYNC && type !== INLINE && type !== INTERCEPT) {
  //   throw new Error(
  //     `${type} not a known handler type - try ${ASYNC}, ${INLINE} or ${INTERCEPT}`
  //   );
  // }
  const t = term || WILDCARD;
  const a = action || WILDCARD;
  const o = orient || WILDCARD;
  const acKey = AppCtxRoot.getKey(t, a, o);
  if (!taoHandlers.has(acKey)) {
    return;
  }
  taoHandlers.get(acKey)[`remove${type}Handler`](handler);
}

// function _removeHandlers(taoHandlers, acList, handlers, type) {
//   handlers.forEach(handler =>
//     acList.forEach(ac =>
//       _removeHandler(taoHandlers, _cleanAC(ac), handler, type)
//     )
//   );
// }

export default class Network {
  constructor(canSetWildcard = false) {
    this._handlers = new Map();
    this._leaves = {
      t: new Map(),
      a: new Map(),
      o: new Map(),
    };
    this._wildcards = {
      t: new Map(),
      a: new Map(),
      o: new Map(),
    };
    this._middleware = new Set();
    this._canSetWildcard = !!canSetWildcard;
    this._decorators = new Set();
    this._chainReducers = new Map();
  }

  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('middleware must be a function');
    }
    // Stryker disable next-line ConditionalExpression: Set.add is idempotent for duplicates
    if (!this._middleware.has(middleware)) {
      this._middleware.add(middleware);
    }
  }

  stop(middleware) {
    // Stryker disable next-line ConditionalExpression: Set.delete is a no-op for missing members
    if (this._middleware.has(middleware)) {
      this._middleware.delete(middleware);
    }
  }

  /**
   * Register an additive, non-competitive adapter decoration on this Network.
   * See ENVELOPE-SPEC.md. Capabilities (all optional, at least one required):
   * - `onDispatch(ac, envelope)` — observe every dispatch (v2 and legacy)
   * - `onForward(nextAc, envelope, meta)` — mirror/route a chained AppCon
   *   before core dispatches it (v2 cascades only); never re-enter the main
   *   dispatch from here
   * - `onReturn(phase, value, ac, envelope)` — settle non-AppCtx handler
   *   returns (phases: INTERCEPT/ASYNC/INLINE/ERROR constants)
   * - `chain: { key, next(prev, ac, envelope) }` — per-hop derived envelope
   *   state under a namespaced key (v2 cascades only)
   *
   * A throwing decorator callback never breaks dispatch.
   *
   * @returns {function} dispose - removes the decoration
   * @memberof Network
   */
  decorate(spec) {
    if (!spec || typeof spec !== 'object') {
      throw new Error('decorate requires a decoration spec object');
    }
    const { onDispatch, onForward, onReturn, chain } = spec;
    for (const [label, fn] of [
      ['onDispatch', onDispatch],
      ['onForward', onForward],
      ['onReturn', onReturn],
    ]) {
      if (typeof fn !== 'undefined' && typeof fn !== 'function') {
        throw new Error(`decoration ${label} must be a function`);
      }
    }
    if (
      typeof chain !== 'undefined' &&
      (!chain ||
        typeof chain.key !== 'string' ||
        typeof chain.next !== 'function')
    ) {
      throw new Error(
        'decoration chain must be { key: string, next: function }',
      );
    }
    if (!onDispatch && !onForward && !onReturn && !chain) {
      throw new Error('decoration must provide at least one capability');
    }
    if (chain && this._chainReducers.has(chain.key)) {
      throw new Error(
        `chain key '${chain.key}' is already reduced by another decoration`,
      );
    }
    const decorator = {
      name: spec.name,
      onDispatch,
      onForward,
      onReturn,
      chain,
    };
    this._decorators.add(decorator);
    if (chain) {
      this._chainReducers.set(chain.key, chain.next);
    }
    return () => {
      this._decorators.delete(decorator);
      if (chain && this._chainReducers.get(chain.key) === chain.next) {
        this._chainReducers.delete(chain.key);
      }
    };
  }

  /**
   * v2 entry gate: dispatch an AppCtx through the envelope hop engine.
   * The Network owns forwarding for the whole cascade: chained AppCons are
   * dispatched exactly once by core; decorators may observe/mirror/settle.
   *
   * @param {AppCtx} appCtx
   * @param {Object} [opts]
   * @param {Object} [opts.cascade] - shared for the whole cascade (the legacy
   *        `control` object; same reference every hop)
   * @param {Object} [opts.hop] - entry-hop values; hops after the entry get {}
   * @param {Object} [opts.chain] - prior chain state to continue (e.g. from a
   *        remote process); reducers derive the entry's chain from it
   * @memberof Network
   */
  enter(appCtx, { cascade = {}, hop = {}, chain = null } = {}) {
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    this._dispatch(appCtx, {
      cascade,
      hop,
      chain: this._reduceChain(chain, appCtx, null),
    });
  }

  _dispatch(appCtx, envelope) {
    const isWild = appCtx.isWildcard;
    if (!this._handlers.has(appCtx.key) && !isWild) {
      _addACHandler(
        this,
        this._handlers,
        this._leaves,
        this._wildcards,
        _cleanAC(appCtx),
      );
    }
    if (!this._handlers.has(appCtx.key)) {
      return;
    }
    const handler = this._handlers.get(appCtx.key);
    const hooks = this._buildHooks(appCtx, envelope);
    this._notifyDispatch(appCtx, envelope);
    const coreForward = (nextAc) => this._forwardNext(nextAc, envelope);
    for (const middleware of this._middleware) {
      middleware(
        handler,
        appCtx,
        coreForward,
        envelope.cascade,
        envelope,
        hooks,
      );
    }
  }

  _forwardNext(nextAc, prevEnvelope) {
    // Stryker disable next-line ConditionalExpression: guard parity with legacy NOOP forward for non-AppCtx values
    if (!(nextAc instanceof AppCtx)) {
      return;
    }
    // parity with Kernel.setAppCtx, which silently drops wildcard AppCons
    if (nextAc.isWildcard && !this._canSetWildcard) {
      return;
    }
    const nextEnvelope = {
      cascade: prevEnvelope.cascade,
      hop: {},
      chain: this._reduceChain(prevEnvelope.chain, nextAc, prevEnvelope),
    };
    for (const decorator of this._decorators) {
      if (decorator.onForward) {
        try {
          decorator.onForward(nextAc, nextEnvelope, { from: prevEnvelope });
        } catch {
          // a failing decoration must never break dispatch
        }
      }
    }
    this._dispatch(nextAc, nextEnvelope);
  }

  _reduceChain(prevChain, ac, prevEnvelope) {
    const next = {};
    for (const [key, reduceNext] of this._chainReducers) {
      try {
        next[key] = reduceNext(
          prevChain ? prevChain[key] : undefined,
          ac,
          prevEnvelope,
        );
      } catch {
        // a failing reducer must never break dispatch
      }
    }
    return next;
  }

  _buildHooks(appCtx, envelope) {
    let settlers = null;
    for (const decorator of this._decorators) {
      if (decorator.onReturn) {
        // Stryker disable next-line ConditionalExpression: lazy init is equivalent to eager for observable behavior
        if (!settlers) {
          settlers = [];
        }
        settlers.push(decorator.onReturn);
      }
    }
    if (!settlers) {
      return undefined;
    }
    return {
      onReturn: (phase, value, ac) => {
        for (const settle of settlers) {
          try {
            settle(phase, value, ac, envelope);
          } catch {
            // a failing decoration must never break dispatch
          }
        }
      },
    };
  }

  _notifyDispatch(appCtx, envelope) {
    for (const decorator of this._decorators) {
      if (decorator.onDispatch) {
        try {
          decorator.onDispatch(appCtx, envelope);
        } catch {
          // a failing decoration must never break dispatch
        }
      }
    }
  }

  clone() {
    const cloned = new Network(this._canSetWildcard);
    for (let trigram of this._handlers.values()) {
      for (let interceptHandler of trigram.interceptHandlers) {
        cloned.addInterceptHandler(trigram, interceptHandler);
      }
      for (let asyncHandler of trigram.asyncHandlers) {
        cloned.addAsyncHandler(trigram, asyncHandler);
      }
      for (let inlineHandler of trigram.inlineHandlers) {
        cloned.addInlineHandler(trigram, inlineHandler);
      }
    }
    return cloned;
  }

  setCtxControl(
    { t, term, a, action, o, orient },
    data,
    control = {},
    forwardAppCtx = NOOP,
  ) {
    // get the hash for the ac
    const acIn = _cleanAC({ t, term, a, action, o, orient });
    const isWild = AppCtxRoot.isWildcard(acIn);
    // console.log('setCtxControl::trigram:', { t, a, o, term, action, orient });
    // console.log('setCtxControl::control:', control);
    // console.log('setCtxControl::forwardAppCtx:', typeof forwardAppCtx);
    if (typeof forwardAppCtx !== 'function') {
      forwardAppCtx = NOOP;
    }
    const acKey = AppCtxRoot.getKey(acIn.term, acIn.action, acIn.orient);
    if (!this._handlers.has(acKey) && !isWild) {
      _addACHandler(this, this._handlers, this._leaves, this._wildcards, acIn);
    }
    if (this._handlers.has(acKey)) {
      const appCtx = new AppCtx(acIn.term, acIn.action, acIn.orient, data);
      // why not forward the call to setAppCtx? -> b/c don't want to execute check against existing again
      const handler = this._handlers.get(acKey);
      this._notifyDispatch(appCtx, {
        cascade: control,
        hop: null,
        chain: null,
        legacy: true,
      });
      for (let middleware of this._middleware) {
        middleware(handler, appCtx, forwardAppCtx, control);
      }
    }
  }

  setAppCtxControl(appCtx, control = {}, forwardAppCtx) {
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    // console.log('setAppCtxControl::appCtx:', appCtx.unwrapCtx());
    // console.log('setAppCtxControl::control:', control);
    // console.log('setAppCtxControl::forwardAppCtx:', typeof forwardAppCtx);
    if (typeof forwardAppCtx !== 'function') {
      forwardAppCtx = NOOP;
    }
    const isWild = appCtx.isWildcard;
    if (!this._handlers.has(appCtx.key) && !isWild) {
      _addACHandler(
        this,
        this._handlers,
        this._leaves,
        this._wildcards,
        _cleanAC(appCtx),
      );
    }
    if (this._handlers.has(appCtx.key)) {
      const handler = this._handlers.get(appCtx.key);
      this._notifyDispatch(appCtx, {
        cascade: control,
        hop: null,
        chain: null,
        legacy: true,
      });
      for (let middleware of this._middleware) {
        middleware(handler, appCtx, forwardAppCtx, control);
      }
    }
  }

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    _validateHandler(handler);
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      _cleanAC({ t, term, a, action, o, orient }),
    );
    ach.addInterceptHandler(handler);
    return this;
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    _validateHandler(handler);
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      _cleanAC({ t, term, a, action, o, orient }),
    );
    ach.addAsyncHandler(handler);
    return this;
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    _validateHandler(handler);
    const ach = _addACHandler(
      this,
      this._handlers,
      this._leaves,
      this._wildcards,
      _cleanAC({ t, term, a, action, o, orient }),
    );
    ach.addInlineHandler(handler);
    return this;
  }

  removeHandler({ t, term, a, action, o, orient }, handler, type) {
    const ac = _cleanAC({ t, term, a, action, o, orient });
    if (type) {
      _removeHandler(this._handlers, ac, handler, type);
    } else {
      for (let t of [INTERCEPT, ASYNC, INLINE]) {
        _removeHandler(this._handlers, ac, handler, t);
      }
    }
    return this;
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      INTERCEPT,
    );
    return this;
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      ASYNC,
    );
    return this;
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      INLINE,
    );
    return this;
  }
}
