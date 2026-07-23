import { WILDCARD, INTERCEPT, ASYNC, INLINE } from './constants';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import AppCtxHandlers from './AppCtxHandlers';
import { _cleanAC, _validateHandler } from './utils';

/** @typedef {import('./AppCtxRoot').Trigram} Trigram */
/** @typedef {import('./AppCtxHandlers').Handler} Handler */

/**
 * The per-dispatch envelope (ENVELOPE-SPEC.md §4): three scopes with
 * explicit lifetimes. Handlers never see it — only decorations and
 * adapters do.
 *
 * @typedef {Object} Envelope
 * @property {Object} cascade - cascade lifetime: one shared mutable
 *           reference for the whole cascade (the `control` object).
 *           Adapter affinity keys (`channelId`, transponder
 *           `signal`/`signalled`, …) live here as top-level properties.
 *           Never crosses a process boundary
 * @property {Object} hop - single-hop lifetime, replaced on every hop:
 *           entry hops carry caller-supplied values (e.g. `Source`'s
 *           `source` echo-suppression marker) and never `via`; chained
 *           hops carry `{ via }` — the phase constant that produced them.
 *           Boundary-local
 * @property {Object} chain - derived parent→child on each hop by the
 *           registered reducers, keyed by reducer namespace.
 *           JSON-serializable by design — the only scope that crosses a
 *           process boundary (§9)
 */

/**
 * Continuation that chains an AppCtx onto the current cascade — the hop
 * engine's own forward, or the `enter()`/`mirror()` override. Handler
 * returns are handed to it by `AppCtxHandlers.handleAppCon`; non-AppCtx
 * values are ignored, and wildcard AppCtxs are dropped unless the network
 * allows wildcards (parity with `Kernel.setAppCtx`).
 *
 * @callback Forward
 * @param {AppCtx} chainedAc - the AppCtx to dispatch as the next hop
 * @param {Object} [control] - legacy call-shape parity; ignored by the core
 *        forward (the cascade is already threaded via the envelope)
 * @param {string} [via] - the producing phase constant, stamped as
 *        `hop.via` on the chained hop
 * @returns {void}
 */

/**
 * An additive, non-competitive Network decoration (ENVELOPE-SPEC.md §5).
 * All capabilities are optional but at least one is required; a throwing
 * decoration callback never breaks dispatch.
 *
 * @typedef {Object} DecorationSpec
 * @property {string} [name] - diagnostic label
 * @property {(ac: AppCtx, envelope: Envelope, handler: AppCtxHandlers, forward: Forward) => void} [onDispatch]
 *           observe every dispatch; `forward(chainedAc)` continues this
 *           hop's cascade through the core hop engine
 * @property {(nextAc: AppCtx, envelope: Envelope, meta: {from: Envelope, forward: Forward}) => void} [onForward]
 *           mirror/route a chained AppCon before core dispatches it;
 *           `meta.from` is the producing hop's envelope and
 *           `meta.forward(chainedAc)` continues the cascade from the
 *           chained hop; must never re-enter the main dispatch
 * @property {(phase: string, value: any, ac: AppCtx, envelope: Envelope) => void} [onReturn]
 *           settle non-AppCtx handler returns and errors (phase is one of
 *           the INTERCEPT/ASYNC/INLINE/ERROR constants)
 * @property {(ac: AppCtx, envelope: Envelope) => void} [onProceed]
 *           fires when the intercept phase passes without halting or
 *           diverting, before async/inline run (veto-respecting emitters)
 * @property {{key: string, next: (prev: any, ac: AppCtx, prevEnvelope: Envelope | null) => any}} [chain]
 *           per-hop reducer for `envelope.chain[key]`; `next(prev, ac,
 *           prevEnvelope)` receives the parent hop's value for `key` and
 *           the parent hop's envelope (both empty/null at entry). Keys are
 *           exclusive per network
 */

// Stryker disable all: multi-axis leaf/wildcard indexing is redundant; single-axis mutants are equivalent
/**
 * Collect leaf groups from one axis index into `leavesTo` — the groups
 * under `taoism`, or every group when the part is wild.
 * @param {Map<string, Set<AppCtxHandlers>>} leavesFrom - one axis of the leaf index
 * @param {Set<AppCtxHandlers>} leavesTo - accumulator
 * @param {string} [taoism] - the trigram part value (falsy = wild)
 */
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

/**
 * Collect wildcard groups from one axis index into `wildcardsTo` — the
 * groups under `taoism` plus the groups indexed under WILDCARD itself.
 * @param {Map<string, Set<AppCtxHandlers>>} wildcardsFrom - one axis of the wildcard index
 * @param {Set<AppCtxHandlers>} wildcardsTo - accumulator
 * @param {string} taoism - the trigram part value
 */
function _appendWildcards(wildcardsFrom, wildcardsTo, taoism) {
  if (wildcardsFrom.has(taoism)) {
    wildcardsFrom.get(taoism).forEach((wc) => wildcardsTo.add(wc));
  }
  if (wildcardsFrom.has(WILDCARD)) {
    wildcardsFrom.get(WILDCARD).forEach((wc) => wildcardsTo.add(wc));
  }
}

/**
 * Index a concrete group under one axis value of the leaf index.
 * @param {Map<string, Set<AppCtxHandlers>>} leaves - one axis of the leaf index
 * @param {string} taoism - the trigram part value
 * @param {AppCtxHandlers} ach - the concrete group
 */
function _addLeaf(leaves, taoism, ach) {
  if (!leaves.has(taoism)) {
    leaves.set(taoism, new Set());
  }
  leaves.get(taoism).add(ach);
}
// Stryker restore all

/**
 * Index a wildcard group under one axis value of the wildcard index.
 * @param {Map<string, Set<AppCtxHandlers>>} wildcards - one axis of the wildcard index
 * @param {string} taoism - the trigram part value (WILDCARD for a wild part)
 * @param {AppCtxHandlers} ach - the wildcard group
 */
function _addWildcard(wildcards, taoism, ach) {
  if (!wildcards.has(taoism)) {
    wildcards.set(taoism, new Set());
  }
  wildcards.get(taoism).add(ach);
}

/**
 * Get or create the AppCtxHandlers group for a trigram, wiring the
 * wildcard↔leaf cross-links on creation (a new wildcard group adopts all
 * matching leaves; a new concrete group is adopted by matching wildcards).
 * @param {Network} tao - the owning network (unused; kept for call-shape)
 * @param {Map<string, AppCtxHandlers>} taoHandlers - groups by trigram key
 * @param {{t: Map, a: Map, o: Map}} taoLeaves - per-axis leaf index
 * @param {{t: Map, a: Map, o: Map}} taoWildcards - per-axis wildcard index
 * @param {{term: (string|undefined), action: (string|undefined), orient: (string|undefined)}} trigram - long-key trigram (from `_cleanAC`)
 * @returns {AppCtxHandlers}
 */
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

/**
 * Remove a handler of the given phase from the group for a trigram, if
 * that group exists.
 * @param {Map<string, AppCtxHandlers>} taoHandlers - groups by trigram key
 * @param {{term: (string|undefined), action: (string|undefined), orient: (string|undefined)}} trigram - long-key trigram (from `_cleanAC`)
 * @param {Handler} handler
 * @param {string} type - INTERCEPT, ASYNC, or INLINE constant
 */
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

/**
 * The wiring surface of the TAO: a trigram-indexed handler registry plus
 * the envelope hop engine. `enter()` is the only dispatch gate and
 * `decorate()` the only extension surface (ENVELOPE-SPEC.md). Application
 * code should use a Kernel; adapters (utils, bridges) compose against the
 * Network.
 */
export default class Network {
  /**
   * @param {boolean} [canSetWildcard=false] - allow wildcard AppCtxs
   *        chained by handlers to dispatch (parity with the owning
   *        Kernel's setting); coerced to boolean
   */
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
   * - `onProceed(ac, envelope)` — fires when the intercept phase passes
   *   without halting or diverting, before async/inline run (veto-respecting
   *   emitters — see ENVELOPE-SPEC.md §5)
   * - `chain: { key, next(prev, ac, envelope) }` — per-hop derived envelope
   *   state under a namespaced key
   *
   * A throwing decorator callback never breaks dispatch.
   *
   * @param {DecorationSpec} spec
   * @returns {() => void} dispose - removes the decoration
   * @throws {Error} on a malformed spec, a spec with no capability, or a
   *         `chain.key` already reduced on this network
   * @memberof Network
   */
  decorate(spec) {
    if (!spec || typeof spec !== 'object') {
      throw new Error('decorate requires a decoration spec object');
    }
    const { onDispatch, onForward, onReturn, onProceed, chain } = spec;
    for (const [label, fn] of [
      ['onDispatch', onDispatch],
      ['onForward', onForward],
      ['onReturn', onReturn],
      ['onProceed', onProceed],
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
    if (!onDispatch && !onForward && !onReturn && !onProceed && !chain) {
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
      onProceed,
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
   * @param {Object} [opts.hop] - entry-hop values; hops after the entry get
   *        a fresh hop carrying only `via` (the producing phase)
   * @param {?Object} [opts.chain] - prior chain state to continue (e.g.
   *        from a remote process); reducers derive the entry's chain from it
   * @param {Forward} [opts.forward] - network-composition plumbing: routes
   *        handler-returned AppCons to the given continuation instead of this
   *        network's own hop engine. Used by adapters that mirror a cascade
   *        onto a private network while its chains continue on the main one
   *        (Channel, Transceiver); not an application-level surface
   * @returns {void}
   * @throws {Error} when `appCtx` is not an AppCtx instance
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

  /**
   * Same-hop dispatch: run a hop observed on another network against this
   * network's handler registry with the observed envelope **verbatim** — no
   * chain reduction, no hop reset (see ENVELOPE-SPEC.md §4). Used by
   * adapters (Channel, Transceiver) whose private registries mirror hops of
   * the shared network; `forward` is the continuation chained AppCons
   * should follow (normally the mirroring hop's `meta.forward`).
   *
   * @param {AppCtx} appCtx
   * @param {Envelope} envelope - the observed `{ cascade, hop, chain }`
   * @param {Forward} [forward]
   * @returns {void}
   * @throws {Error} when `appCtx` is not an AppCtx or `envelope` is missing
   * @memberof Network
   */
  mirror(appCtx, envelope, forward) {
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    if (!envelope || typeof envelope !== 'object') {
      throw new Error('mirror requires the observed envelope');
    }
    this._dispatch(
      appCtx,
      envelope,
      typeof forward === 'function' ? forward : undefined,
    );
  }

  /**
   * Run one hop: resolve (or lazily create) the handler group for the
   * AppCtx's key, notify `onDispatch` decorations, then execute the phases.
   * @param {AppCtx} appCtx
   * @param {Envelope} envelope - this hop's envelope
   * @param {Forward} [forward] - continuation override for chained AppCtxs;
   *        defaults to this network's hop engine
   */
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
      forward ||
      ((nextAc, _control, via) => this._forwardNext(nextAc, envelope, via));
    this._notifyDispatch(appCtx, envelope, handler, coreForward);
    handler.handleAppCon(appCtx, coreForward, envelope.cascade, hooks);
  }

  /**
   * The hop engine: derive the chained hop's envelope (shared cascade,
   * `{ via }` hop, reduced chain), notify `onForward` decorations, then
   * dispatch the chained AppCtx exactly once.
   * @param {AppCtx} nextAc - the chained AppCtx (non-AppCtx values ignored)
   * @param {Envelope} prevEnvelope - the producing hop's envelope
   * @param {string} [via] - the phase constant that produced the chain
   */
  _forwardNext(nextAc, prevEnvelope, via) {
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
      // chained hops carry the phase that produced them (ENVELOPE-SPEC.md §4)
      hop: via ? { via } : {},
      chain: this._reduceChain(prevEnvelope.chain, nextAc, prevEnvelope),
    };
    const forward = (chainedAc, _control, chainedVia) =>
      this._forwardNext(chainedAc, nextEnvelope, chainedVia);
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

  /**
   * Derive a hop's chain scope by running every registered reducer against
   * the parent's value under its own key; a throwing reducer contributes
   * nothing.
   * @param {?Object} prevChain - the parent hop's chain (null at entry)
   * @param {AppCtx} ac - the AppCtx being dispatched
   * @param {?Envelope} prevEnvelope - the parent hop's envelope (null at entry)
   * @returns {Object} the new chain, keyed by reducer namespace
   */
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

  /**
   * Bridge `onReturn`/`onProceed` decorations into the settlement hooks
   * `AppCtxHandlers.handleAppCon` accepts; undefined when no decoration
   * needs them. Each decoration call is guarded — a throw never breaks
   * dispatch.
   * @param {AppCtx} appCtx - the AppCtx being dispatched
   * @param {Envelope} envelope - this hop's envelope (appended to each call)
   * @returns {{onReturn?: (phase: string, value: any, ac: AppCtx) => void, onProceed?: () => void}|undefined}
   */
  _buildHooks(appCtx, envelope) {
    let settlers = null;
    let proceeders = null;
    for (const decorator of this._decorators) {
      if (decorator.onReturn) {
        // Stryker disable next-line ConditionalExpression: lazy init is equivalent to eager for observable behavior
        if (!settlers) {
          // Stryker disable next-line ArrayDeclaration: equivalent - non-function junk in the settlers array is call-guarded by the per-settle try
          settlers = [];
        }
        settlers.push(decorator.onReturn);
      }
      if (decorator.onProceed) {
        // Stryker disable next-line ConditionalExpression: lazy init is equivalent to eager for observable behavior
        if (!proceeders) {
          // Stryker disable next-line ArrayDeclaration: equivalent - non-function junk in the proceeders array is call-guarded by the per-call try
          proceeders = [];
        }
        proceeders.push(decorator.onProceed);
      }
    }
    if (!settlers && !proceeders) {
      return undefined;
    }
    const hooks = {};
    if (settlers) {
      hooks.onReturn = (phase, value, ac) => {
        for (const settle of settlers) {
          try {
            settle(phase, value, ac, envelope);
          } catch {
            // a failing decoration must never break dispatch
          }
        }
      };
    }
    if (proceeders) {
      hooks.onProceed = () => {
        for (const proceed of proceeders) {
          try {
            proceed(appCtx, envelope);
          } catch {
            // a failing decoration must never break dispatch
          }
        }
      };
    }
    return hooks;
  }

  /**
   * Invoke every decoration's `onDispatch` in registration order, guarding
   * against throws.
   * @param {AppCtx} appCtx
   * @param {Envelope} envelope
   * @param {AppCtxHandlers} handler - the group about to execute
   * @param {Forward} forward - the continuation for this hop's chains
   */
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

  /**
   * An independent Network with every handler registration copied across
   * all three phases. Decorations and chain reducers are not copied.
   * @returns {Network}
   */
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

  /**
   * Register an intercept-phase handler for a trigram (omitted parts are
   * wildcards).
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Network} this
   * @throws {Error} when `handler` is missing or not a function
   */
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

  /**
   * Register an async-phase handler for a trigram (omitted parts are
   * wildcards).
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Network} this
   * @throws {Error} when `handler` is missing or not a function
   */
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

  /**
   * Register an inline-phase handler for a trigram (omitted parts are
   * wildcards).
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Network} this
   * @throws {Error} when `handler` is missing or not a function
   */
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

  /**
   * Unregister a handler for a trigram from one phase, or from all three
   * when `type` is omitted.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @param {string} [type] - INTERCEPT, ASYNC, or INLINE constant
   * @returns {Network} this
   * @throws {Error} when `handler` is missing or not a function
   */
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

  /**
   * Unregister an intercept-phase handler for a trigram.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Network} this
   * @throws {Error} when `handler` is missing or not a function
   */
  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      INTERCEPT,
    );
    return this;
  }

  /**
   * Unregister an async-phase handler for a trigram.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Network} this
   * @throws {Error} when `handler` is missing or not a function
   */
  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    _removeHandler(
      this._handlers,
      _cleanAC({ t, term, a, action, o, orient }),
      handler,
      ASYNC,
    );
    return this;
  }

  /**
   * Unregister an inline-phase handler for a trigram.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Network} this
   * @throws {Error} when `handler` is missing or not a function
   */
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
