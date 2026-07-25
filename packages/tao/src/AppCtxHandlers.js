import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import { INTERCEPT, ASYNC, INLINE, ERROR } from './constants';
import { isIterable } from './utils';

/** @typedef {import('./Network').Forward} Forward */

/**
 * A TAO handler: receives the concrete trigram (short keys) and the
 * signal's data (always an object, possibly empty). Returning — or
 * resolving to — an AppCtx chains that context onto the cascade. Other
 * returns are phase-dependent: a truthy intercept return halts the signal;
 * non-null async/inline returns go to settlement (`onReturn`) when hooks
 * are attached, and are otherwise discarded.
 *
 * @callback Handler
 * @param {{t: string, a: string, o: string}} tao - the trigram being handled
 * @param {Object} data - the context data (never null/undefined)
 * @returns {AppCtx|Promise<AppCtx>|*}
 */

/**
 * Local no-op console standing in for the loop's debug logging.
 * @type {{error: (...args: any[]) => void, log: (...args: any[]) => void}}
 */
const console = {
  error: () => 1,
  log: () => 1,
};

/**
 * The handler group for one trigram key: holds the intercept/async/inline
 * handler sets and runs the three-phase dispatch for matching AppCons.
 * Wildcard groups track their concrete "leaf" groups and propagate handler
 * add/remove to them, so dispatch only ever executes a concrete group.
 */
export default class AppCtxHandlers extends AppCtxRoot {
  /**
   * @param {string} [term] - the term (missing = WILDCARD)
   * @param {string} [action] - the action (missing = WILDCARD)
   * @param {string} [orient] - the orient (missing = WILDCARD)
   * @param {Iterable<AppCtxHandlers>} [leafAppConHandlers] - initial concrete
   *        leaf groups this (wildcard) group propagates its handlers to
   */
  constructor(term, action, orient, leafAppConHandlers) {
    super(term, action, orient);

    this._leafAppConHandlers = new Set(leafAppConHandlers);
    this._intercept = new Set();
    this._async = new Set();
    this._inline = new Set();
  }

  /**
   * Track a concrete leaf group under this wildcard group (no-op unless this
   * group is wild, the leaf is concrete, and the leaf matches this trigram)
   * and copy this group's current handlers onto it.
   * @param {AppCtxHandlers} leafAch
   * @throws {Error} when `leafAch` is not an AppCtxHandlers
   */
  addLeafHandler(leafAch) {
    if (!(leafAch instanceof AppCtxHandlers)) {
      throw new Error("'leafAch' is not an instance of AppCtxHandlers");
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
      this._intercept.forEach((inHandler) =>
        leafAch.addInterceptHandler(inHandler),
      );
      this._async.forEach((aHandler) => leafAch.addAsyncHandler(aHandler));
      this._inline.forEach((inHandler) => leafAch.addInlineHandler(inHandler));
    }
  }

  /**
   * Add one leaf group or an iterable of them via {@link AppCtxHandlers#addLeafHandler}.
   * @param {AppCtxHandlers|Iterable<AppCtxHandlers>} leafAches
   */
  addLeafHandlers(leafAches) {
    if (!isIterable(leafAches)) {
      this.addLeafHandler(leafAches);
    } else {
      for (let leaf of leafAches) {
        this.addLeafHandler(leaf);
      }
    }
  }

  /**
   * Register an intercept-phase handler (propagates to leaf groups).
   * @param {Handler} handler
   * @throws {Error} when `handler` is not a function
   */
  addInterceptHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An InterceptHandler can only be a function');
    }
    this._intercept.add(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.addInterceptHandler(handler),
    );
  }

  /**
   * Unregister an intercept-phase handler (propagates to leaf groups).
   * @param {Handler} handler
   */
  removeInterceptHandler(handler) {
    this._intercept.delete(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.removeInterceptHandler(handler),
    );
  }

  /**
   * Register an async-phase handler (propagates to leaf groups).
   * @param {Handler} handler
   * @throws {Error} when `handler` is not a function
   */
  addAsyncHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An AsyncHandler can only be a function');
    }
    this._async.add(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.addAsyncHandler(handler),
    );
  }

  /**
   * Unregister an async-phase handler (propagates to leaf groups).
   * @param {Handler} handler
   */
  removeAsyncHandler(handler) {
    this._async.delete(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.removeAsyncHandler(handler),
    );
  }

  /**
   * Register an inline-phase handler (propagates to leaf groups).
   * @param {Handler} handler
   * @throws {Error} when `handler` is not a function
   */
  addInlineHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An InlineHandler can only be a function');
    }
    this._inline.add(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.addInlineHandler(handler),
    );
  }

  /**
   * Unregister an inline-phase handler (propagates to leaf groups).
   * @param {Handler} handler
   */
  removeInlineHandler(handler) {
    this._inline.delete(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.removeInlineHandler(handler),
    );
  }

  // Might need but removing to have accurate code coverage metric
  // populateHandlersFromWildcards() {}

  /** The registered intercept handlers. @returns {IterableIterator<Handler>} */
  get interceptHandlers() {
    return this._intercept.values();
  }

  /** The registered async handlers. @returns {IterableIterator<Handler>} */
  get asyncHandlers() {
    return this._async.values();
  }

  /** The registered inline handlers. @returns {IterableIterator<Handler>} */
  get inlineHandlers() {
    return this._inline.values();
  }

  /**
   * Dispatch an AppCon through the three handler phases.
   *
   * `hooks` (optional, supplied by Network decorations — see ENVELOPE-SPEC.md
   * §6) receives what the loop otherwise discards: `hooks.onReturn(phase,
   * value, ac)` is called for non-AppCtx truthy intercept returns (which
   * still halt), non-null non-AppCtx async/inline returns, and thrown
   * handler errors (phase = ERROR — which are rethrown when no hooks are
   * present, preserving pre-envelope behavior); `hooks.onProceed()` fires
   * when the intercept phase passes without halting or diverting, before
   * the async/inline phases run (§5 — veto-respecting emitters).
   *
   * `setAppCtx` receives the producing phase as a third argument so the
   * hop engine can stamp `hop.via` on chained hops (§4).
   *
   * @param {AppCtx} ac - the Application Context to handle
   * @param {Forward} setAppCtx - continuation for handler-chained AppCtxs
   *        (the hop engine's forward, or an adapter override); called as
   *        `setAppCtx(nextAc, control, phase)`
   * @param {Object} control - the cascade scope (`envelope.cascade`), passed
   *        through to `setAppCtx`
   * @param {{onReturn?: (phase: string, value: any, ac: AppCtx) => void, onProceed?: () => void}} [hooks]
   *        settlement hooks built by the Network from decorations
   * @returns {Promise<void>} settles after the intercept and inline phases
   *        complete (async handlers are forked, not awaited); rejects on a
   *        dispatch error only when no `onReturn` hook is present
   */
  async handleAppCon(ac, setAppCtx, control, hooks) {
    const { t, a, o, data } = ac;
    const onReturn =
      hooks && typeof hooks.onReturn === 'function' ? hooks.onReturn : null;
    const onProceed =
      hooks && typeof hooks.onProceed === 'function' ? hooks.onProceed : null;
    try {
      await this._handlePhases(
        ac,
        setAppCtx,
        control,
        onReturn,
        onProceed,
        t,
        a,
        o,
        data,
      );
    } catch (dispatchErr) {
      if (onReturn) {
        onReturn(ERROR, dispatchErr, ac);
        return;
      }
      throw dispatchErr;
    }
  }

  /**
   * Run the three phases in order: await intercepts (halt/divert
   * short-circuits), fork async handlers, await inline handlers, settle
   * inline returns, then set the spooled chained AppCtxs.
   *
   * @param {AppCtx} ac - the Application Context being handled
   * @param {Forward} setAppCtx - continuation for chained AppCtxs
   * @param {Object} control - the cascade scope, threaded to `setAppCtx`
   * @param {((phase: string, value: any, ac: AppCtx) => void)|null} onReturn - settlement sink
   * @param {(() => void)|null} onProceed - intercept-phase-passed hook
   * @param {string} t - the term (from `ac`)
   * @param {string} a - the action (from `ac`)
   * @param {string} o - the orient (from `ac`)
   * @param {Object} data - the context data (from `ac`)
   */
  async _handlePhases(
    ac,
    setAppCtx,
    control,
    onReturn,
    onProceed,
    t,
    a,
    o,
    data,
  ) {
    /*
     * Intercept Handlers
     * always occur first
     * have the ability to prevent other handlers from firing on this AC
     * optionally can return a single AC that will be set as the new AC instead of the incoming AC
     */
    for (let interceptH of this.interceptHandlers) {
      // using the decorator pattern to call these?
      let intercepted = await interceptH({ t, a, o }, data);
      if (!intercepted) {
        continue;
      }
      if (intercepted instanceof AppCtx) {
        // Stryker disable all: local console is a noop; catch only swallows
        try {
          setAppCtx(intercepted, control, INTERCEPT);
        } catch (interceptErr) {
          if (onReturn) {
            onReturn(ERROR, interceptErr, ac);
          }
          console.log(
            'error setting context returned from intercept handler:',
            interceptErr,
          );
        }
        // Stryker restore all
      } else if (onReturn) {
        // truthy non-AppCtx intercept return still halts; settlement sees it
        onReturn(INTERCEPT, intercepted, ac);
      }
      return;
    }
    if (onProceed) {
      // the intercept phase passed without halt or divert
      onProceed();
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
    let asyncKickoffs = 0;
    for (let asyncH of this.asyncHandlers) {
      (() => {
        asyncKickoffs += 1;
        // Stryker disable next-line all: debug logging via noop console
        console.log(
          `>>>>>>>> starting async context within ['${t}', '${a}', '${o}'] <<<<<<<<<<`,
        );
        // the async-phase contract (ENVELOPE-SPEC §4): async handlers are
        // out-of-band side effects — the CALL itself is deferred to the
        // event loop, never executed in the entrant's synchronous stack,
        // and a throw before the handler's first await is inherently a
        // rejection. The queue yield after this loop preserves the
        // priority guarantee: every async handler is called before the
        // first inline handler runs.
        Promise.resolve()
          .then(() => asyncH({ t, a, o }, data))
          .then((nextAc) => {
            if (nextAc instanceof AppCtx) {
              setAppCtx(nextAc, control, ASYNC);
            } else if (onReturn && nextAc != null) {
              onReturn(ASYNC, nextAc, ac);
            }
            // Stryker disable next-line all: debug logging via noop console
            console.log(
              `>>>>>>>> ending async context within ['${t}', '${a}', '${o}'] <<<<<<<<<<`,
            );
          })
          .catch((asyncErr) => {
            if (onReturn) {
              onReturn(ERROR, asyncErr, ac);
              return;
            }
            // swallow async errors
            // possibility to set an AC for errors
            // Stryker disable next-line all: legacy swallow via noop console
            console.error('error in async handler:', asyncErr);
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
    if (asyncKickoffs) {
      // one microtask yield: the deferred async calls enqueued above are
      // FIFO-ahead of this continuation, so every async handler has been
      // called (not awaited) before the first inline handler runs — the
      // protocol's priority guarantee without synchronous invocation
      await undefined;
    }
    const nextSpool = [];
    const inlineReturns = [];
    for (let inlineH of this.inlineHandlers) {
      let nextInlineAc = await inlineH({ t, a, o }, data);
      if (nextInlineAc instanceof AppCtx) {
        nextSpool.push(nextInlineAc);
      } else if (onReturn && nextInlineAc != null) {
        inlineReturns.push(nextInlineAc);
      }
    }
    // settlement sees inline returns after every inline handler has run and
    // before any chained AppCons dispatch (Transceiver resolve ordering)
    for (let inlineValue of inlineReturns) {
      onReturn(INLINE, inlineValue, ac);
    }
    // Stryker disable next-line ConditionalExpression: empty spool makes the loop a no-op either way
    if (nextSpool.length) {
      for (let nextAc of nextSpool) {
        try {
          setAppCtx(nextAc, control, INLINE);
        } catch (inlineErr) {
          if (onReturn) {
            onReturn(ERROR, inlineErr, ac);
          }
          // Stryker disable next-line all: legacy swallow via noop console
          console.error('error on next inline:', inlineErr);
        }
      }
    }
  }
}
