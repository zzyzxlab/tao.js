import { Network } from '@tao.js/core';

// for backwards compatibility
const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

let transceiverId = 0;
function newTransceiverId() {
  return (transceiverId = ++transceiverId % MAX_SAFE_INTEGER);
}

let signalId = 0;
function newSignalId() {
  return (signalId = ++signalId % MAX_SAFE_INTEGER);
}

function transceiverControl(transceiverId, resolve, reject) {
  return { transceiverId, signal: { id: newSignalId(), resolve, reject } };
}

/**
 * Like a Transponder, a Transceiver converts Signals on a Network to Promises.
 * Unlike a Transponder, a Transceiver allows the handlers attached to it to control
 * the behavior of the Promise.
 *
 * If a Handler returns an AppCtx, then it will be chained like a standard handler.
 *
 * If a Handler returns something other than an AppCtx it will behave as the following:
 * - returning truthy value from an InterceptHandler will REJECT the Promise
 * - returning any value not `null` or `undefined` from an AsyncHandler or InlineHandler
 *   it will be used to RESOLVE the Promise
 * - throwing an Error in any Handler will REJECT the Promise
 *
 * A signal to a Promise can only happen once, so the first thing that happens
 * will conclude the Promise despite other handlers that may be continue to be
 * called depending on how you set up your Handlers
 *
 * @export
 * @class Transceiver
 */
export default class Transceiver {
  constructor(network, id, timeoutMs = 0, promise = Promise) {
    this._transceiverId =
      typeof id === 'function'
        ? id(newTransceiverId())
        : id || newTransceiverId();
    this._signals = new Network();
    this._signals.use(this.handleSignalAppCon);
    this._network =
      typeof network.use === 'function' ? network : network._network;
    this._timeoutMs = timeoutMs;
    this._promise = promise;
    this._cloneWithId = typeof id === 'function' ? id : undefined;
  }

  setCtx = ({ t, term, a, action, o, orient }, data) => {
    const transceiverId = this._transceiverId;
    const timeoutMs = this._timeoutMs;
    const promise = this._promise;

    return new promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(`reached timeout of: ${timeoutMs}ms`);
        }, timeoutMs);
      }
      this._network.setCtxControl(
        { t, term, a, action, o, orient },
        data,
        transceiverControl(transceiverId, resolve, reject),
        this.forwardAppCtx
      );
    });
  };

  setAppCtx = ac => {
    const transceiverId = this._transceiverId;
    const timeoutMs = this._timeoutMs;
    const promise = this._promise;

    return new promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(`reached timeout of: ${timeoutMs}ms`);
        }, timeoutMs);
      }
      this._network.setAppCtxControl(
        ac,
        transceiverControl(transceiverId, resolve, reject),
        this.forwardAppCtx
      );
    });
  };

  forwardAppCtx = (ac, control) => {
    if (control.transceiverId === this._transceiverId) {
      this._signals.setAppCtxControl(ac, control, this.forwardAppCtx);
    }
    this._network.setAppCtxControl(ac, control, this.forwardAppCtx);
  };

  handleSignalAppCon = (handler, ac, forwardAppCtx, control) => {
    if (
      control.transceiverId === this._transceiverId &&
      control.signal &&
      !control.signalled
    ) {
      try {
        this.captureSignal(handler, ac, forwardAppCtx, control).catch(
          handleErr => {
            if (!control.signalled) {
              control.signalled = true;
              control.signal.reject(handleErr);
            }
          }
        );
      } catch (handleErr) {
        if (!control.signalled) {
          control.signalled = true;
          control.signal.reject(handleErr);
        }
      }
    }
    // ALERT: handler will have already handled the AppCon before now
    // return handler.handleAppCon(ac, forwardAppCtx, control);
  };

  // TODO: refactor AppCtxHandlers to allow an override of behavior
  captureSignal = async (handler, ac, setAppCtx, control) => {
    const { t, a, o, data } = ac;
    /*
     * Intercept Handlers
     * always occur first
     * have the ability to prevent other handlers from firing on this AC
     * optionally can return a single AC that will be set as the new AC instead of the incoming AC
     *
     * If handler returns truthy value that is not an AppCtx then it will
     * be used to REJECT a signal promise that is part of the message
     * control
     */
    for (let interceptH of handler.interceptHandlers) {
      // using the decorator pattern to call these?
      let intercepted = await interceptH({ t, a, o }, data);
      if (!intercepted) {
        continue;
      }
      if (intercepted instanceof AppCtx) {
        try {
          setAppCtx(intercepted, control);
        } catch (interceptErr) {
          if (!control.signalled) {
            control.signalled = true;
            control.signal.reject(interceptErr);
          }
        }
      } else if (!control.signalled) {
        control.signalled = true;
        control.signal.reject(intercepted);
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
     *
     * If handler returns anything that is not an AppCtx then it will
     * be used to RESOLVE a signal promise that is part of the message
     * control
     * If handler or chained handlers throw anything then it will be
     * used to REJECT a signal promise that is part of the message
     * control
     */
    for (let asyncH of handler.asyncHandlers) {
      (() => {
        Promise.resolve(asyncH({ t, a, o }, data))
          .then(nextAc => {
            if (nextAc != null) {
              if (nextAc instanceof AppCtx) {
                setAppCtx(nextAc, control);
              } else if (!control.signalled) {
                control.signalled = true;
                control.signal.resolve(nextAc);
              }
            }
          })
          .catch(asyncErr => {
            if (!control.signalled) {
              control.signalled = true;
              control.signal.reject(asyncErr);
            }
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
     *
     * If handler returns anything that is not an AppCtx then it will
     * be used to RESOLVE a signal promise that is part of the message
     * control
     * If handler or chained handlers throw anything then it will be
     * used to REJECT a signal promise that is part of the message
     * control
     */
    const nextSpool = [];
    let firstResolve = null;
    for (let inlineH of handler.inlineHandlers) {
      let nextInlineAc = await inlineH({ t, a, o }, data);
      if (nextInlineAc != null) {
        if (nextInlineAc instanceof AppCtx) {
          nextSpool.push(nextInlineAc);
        } else if (!firstResolve) {
          firstResolve = nextInlineAc;
        }
      }
    }
    if (!control.signalled && firstResolve) {
      control.signalled = true;
      control.signal.resolve(firstResolve);
    }
    if (nextSpool.length) {
      for (let nextAc of nextSpool) {
        try {
          setAppCtx(nextAc, control);
        } catch (inlineErr) {
          if (!control.signalled) {
            control.signalled = true;
            control.signal.reject(inlineErr);
          }
        }
      }
    }
  };

  addSignalHandler = ({ t, term, a, action, o, orient }, handler) => {
    this._signals.addInlineHandler({ t, term, a, action, o, orient }, handler);
  };

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.addAsyncHandler({ t, term, a, action, o, orient }, handler);
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.addInlineHandler({ t, term, a, action, o, orient }, handler);
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }
}
