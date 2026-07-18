import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import { INTERCEPT, ASYNC, INLINE, ERROR } from './constants';
import { isIterable } from './utils';

const console = {
  error: () => 1,
  log: () => 1,
};

export default class AppCtxHandlers extends AppCtxRoot {
  constructor(term, action, orient, leafAppConHandlers) {
    super(term, action, orient);

    this._leafAppConHandlers = new Set(leafAppConHandlers);
    this._intercept = new Set();
    this._async = new Set();
    this._inline = new Set();
  }

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
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.addInterceptHandler(handler),
    );
  }

  removeInterceptHandler(handler) {
    this._intercept.delete(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.removeInterceptHandler(handler),
    );
  }

  addAsyncHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An AsyncHandler can only be a function');
    }
    this._async.add(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.addAsyncHandler(handler),
    );
  }

  removeAsyncHandler(handler) {
    this._async.delete(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.removeAsyncHandler(handler),
    );
  }

  addInlineHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('An InlineHandler can only be a function');
    }
    this._inline.add(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.addInlineHandler(handler),
    );
  }

  removeInlineHandler(handler) {
    this._inline.delete(handler);
    this._leafAppConHandlers.forEach((leafAch) =>
      leafAch.removeInlineHandler(handler),
    );
  }

  // Might need but removing to have accurate code coverage metric
  // populateHandlersFromWildcards() {}

  get interceptHandlers() {
    return this._intercept.values();
  }

  get asyncHandlers() {
    return this._async.values();
  }

  get inlineHandlers() {
    return this._inline.values();
  }

  /**
   * Dispatch an AppCon through the three handler phases.
   *
   * `hooks` (optional, supplied by Network decorations — see ENVELOPE-SPEC.md
   * §6) receives what the legacy loop discards: `hooks.onReturn(phase, value,
   * ac)` is called for non-AppCtx truthy intercept returns (which still
   * halt), non-null non-AppCtx async/inline returns, and thrown handler
   * errors (phase = ERROR — which are rethrown when no hooks are present,
   * preserving legacy behavior).
   */
  async handleAppCon(ac, setAppCtx, control, hooks) {
    const { t, a, o, data } = ac;
    const onReturn =
      hooks && typeof hooks.onReturn === 'function' ? hooks.onReturn : null;
    try {
      await this._handlePhases(ac, setAppCtx, control, onReturn, t, a, o, data);
    } catch (dispatchErr) {
      if (onReturn) {
        onReturn(ERROR, dispatchErr, ac);
        return;
      }
      throw dispatchErr;
    }
  }

  async _handlePhases(ac, setAppCtx, control, onReturn, t, a, o, data) {
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
          setAppCtx(intercepted, control);
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
        // Stryker disable next-line all: debug logging via noop console
        console.log(
          `>>>>>>>> starting async context within ['${t}', '${a}', '${o}'] <<<<<<<<<<`,
        );
        Promise.resolve(asyncH({ t, a, o }, data))
          .then((nextAc) => {
            if (nextAc instanceof AppCtx) {
              setAppCtx(nextAc, control);
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
          setAppCtx(nextAc, control);
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
