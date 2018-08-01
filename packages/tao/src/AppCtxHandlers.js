import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import { isIterable } from './utils';

const console = {
  error: () => 1,
  log: () => 1
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

  async handleAppCon(ac, setAppCtx) {
    const { t, a, o, data } = ac;
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
        try {
          setAppCtx(intercepted);
        } catch (interceptErr) {
          console.log(
            'error setting context returned from intercept handler:',
            interceptErr
          );
        }
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
              setAppCtx(nextAc);
            }
            console.log(
              `>>>>>>>> ending async context within ['${t}', '${a}', '${o}'] <<<<<<<<<<`
            );
          })
          .catch(asyncErr => {
            // swallow async errors
            // possibility to set an AC for errors
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
    for (let inlineH of this.inlineHandlers) {
      let nextInlineAc = await inlineH({ t, a, o }, data);
      if (nextInlineAc && nextInlineAc instanceof AppCtx) {
        nextSpool.push(nextInlineAc);
      }
    }
    if (nextSpool.length) {
      for (let nextAc of nextSpool) {
        try {
          setAppCtx(nextAc);
        } catch (inlineErr) {
          console.error('error on next inline:', inlineErr);
        }
      }
    }
  }
}
