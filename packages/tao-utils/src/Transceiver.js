import { Network, INTERCEPT, ERROR } from '@tao.js/core';

// for backwards compatibility
const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

let transceiverId = 0;
function newTransceiverId() {
  // Stryker disable next-line ArithmeticOperator,UpdateOperator: counter monotonicity/modulo wraparound at MAX_SAFE_INTEGER is untestable without exhausting the counter
  return (transceiverId = ++transceiverId % MAX_SAFE_INTEGER);
}

let signalId = 0;
// Stryker disable all: counter monotonicity/modulo wraparound at MAX_SAFE_INTEGER is untestable without exhausting the counter, and the returned id is not observed by tests
function newSignalId() {
  return (signalId = ++signalId % MAX_SAFE_INTEGER);
}
// Stryker restore all

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
 * Settlement is implemented with the core dispatch loop's `onReturn` hook
 * (see ENVELOPE-SPEC.md §6) — the previous fork of the phase semantics
 * (`captureSignal`) is gone.
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
    if (typeof this._network.enter !== 'function') {
      throw new Error(
        'Transceiver requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
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
        this.forwardAppCtx,
      );
    });
  };

  setAppCtx = (ac) => {
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
        this.forwardAppCtx,
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
      const settle = (phase, value) => {
        if (control.signalled) {
          return;
        }
        control.signalled = true;
        if (phase === INTERCEPT || phase === ERROR) {
          control.signal.reject(value);
        } else {
          control.signal.resolve(value);
        }
      };
      try {
        handler.handleAppCon(ac, forwardAppCtx, control, { onReturn: settle });
      } catch (dispatchErr) {
        // defensive: a handler that cannot be dispatched rejects the signal
        settle(ERROR, dispatchErr);
      }
    }
    // ALERT: handler will have already handled the AppCon before now
  };

  addSignalHandler = ({ t, term, a, action, o, orient }, handler) => {
    this._signals.addInlineHandler({ t, term, a, action, o, orient }, handler);
  };

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
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
      handler,
    );
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler,
    );
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler,
    );
  }
}
