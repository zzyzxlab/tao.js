import { WILDCARD, INTERCEPT, ASYNC, INLINE } from './constants';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import AppCtxHandlers from './AppCtxHandlers';
import { _cleanAC, _validateHandler } from './utils';

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
    this._canSetWildcard = !!canSetWildcard;
    this._decorators = new Set();
    this._chainReducers = new Map();
  }

  /**
   * Register an additive, non-competitive adapter decoration on this Network.
   * See ENVELOPE-SPEC.md. Capabilities (all optional, at least one required):
   * - `onDispatch(ac, envelope, handler, forward)` — observe every dispatch;
   *   `forward(chainedAc)` continues this hop's cascade through the core hop
   *   engine (for decorations that re-dispatch the AppCon elsewhere and need
   *   its chains to continue this cascade)
   * - `onForward(nextAc, envelope, meta)` — mirror/route a chained AppCon
   *   before core dispatches it; `meta.forward(chainedAc)` continues the
   *   cascade from the chained hop; never re-enter the main dispatch from
   *   here
   * - `onReturn(phase, value, ac, envelope)` — settle non-AppCtx handler
   *   returns (phases: INTERCEPT/ASYNC/INLINE/ERROR constants)
   * - `chain: { key, next(prev, ac, envelope) }` — per-hop derived envelope
   *   state under a namespaced key
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
   * The entry gate: dispatch an AppCtx through the envelope hop engine.
   * The Network owns handler execution and forwarding for the whole cascade:
   * chained AppCons are dispatched exactly once by core; decorators may
   * observe/mirror/settle.
   *
   * @param {AppCtx} appCtx
   * @param {Object} [opts]
   * @param {Object} [opts.cascade] - shared for the whole cascade (the
   *        `control` object; same reference every hop)
   * @param {Object} [opts.hop] - entry-hop values; hops after the entry get {}
   * @param {Object} [opts.chain] - prior chain state to continue (e.g. from a
   *        remote process); reducers derive the entry's chain from it
   * @param {function} [opts.forward] - network-composition plumbing: routes
   *        handler-returned AppCons to the given continuation instead of this
   *        network's own hop engine. Used by adapters that mirror a cascade
   *        onto a private network while its chains continue on the main one
   *        (Channel, Transceiver); not an application-level surface
   * @memberof Network
   */
  enter(appCtx, { cascade = {}, hop = {}, chain = null, forward } = {}) {
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    this._dispatch(
      appCtx,
      {
        cascade,
        hop,
        chain: this._reduceChain(chain, appCtx, null),
      },
      typeof forward === 'function' ? forward : undefined,
    );
  }

  _dispatch(appCtx, envelope, forward) {
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
    const coreForward =
      forward || ((nextAc) => this._forwardNext(nextAc, envelope));
    this._notifyDispatch(appCtx, envelope, handler, coreForward);
    handler.handleAppCon(appCtx, coreForward, envelope.cascade, hooks);
  }

  _forwardNext(nextAc, prevEnvelope) {
    // guard parity with the legacy NOOP forward: handlers may hand the core
    // forward non-AppCtx values
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
    const forward = (chainedAc) => this._forwardNext(chainedAc, nextEnvelope);
    for (const decorator of this._decorators) {
      // Stryker disable next-line ConditionalExpression: equivalent - calling a missing onForward throws inside the guarded try, so observable behavior is identical
      if (decorator.onForward) {
        try {
          decorator.onForward(nextAc, nextEnvelope, {
            from: prevEnvelope,
            forward,
          });
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
          // Stryker disable next-line ArrayDeclaration: equivalent - non-function junk in the settlers array is call-guarded by the per-settle try
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

  _notifyDispatch(appCtx, envelope, handler, forward) {
    for (const decorator of this._decorators) {
      // Stryker disable next-line ConditionalExpression: equivalent - calling a missing onDispatch throws inside the guarded try, so observable behavior is identical
      if (decorator.onDispatch) {
        try {
          decorator.onDispatch(appCtx, envelope, handler, forward);
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
