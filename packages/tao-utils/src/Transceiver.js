import { AppCtx, Network, INTERCEPT, ERROR } from '@tao.js/core';

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
 * Fully envelope-native (see ENVELOPE-SPEC.md §12): entries go through
 * `enter` with the transceiver's cascade tag; chained AppCons of matching
 * cascades are mirrored onto the private signals network by an `onForward`
 * decoration (signals dispatch starts before main dispatch of the same
 * hop); signal-handler returns settle the Promise through the signals
 * network's `onReturn` settlement hook; and chains from signal handlers
 * continue the cascade envelope through the main network's hop engine.
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
    this._surface =
      typeof network.enter === 'function' ? network : network._network;
    if (
      !this._surface ||
      typeof this._surface.enter !== 'function' ||
      typeof this._surface.decorate !== 'function'
    ) {
      throw new Error(
        'Transceiver requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    // mirror from the shared network (a Channel surface delegates entries to
    // it); the cascade tag filters this transceiver's cascades either way
    this._network = this._surface._network || this._surface;
    this._undecorateMirror = this._network.decorate({
      // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
      name: `transceiver:${this._transceiverId}`,
      onForward: (nextAc, envelope, meta) => {
        if (envelope.cascade.transceiverId === this._transceiverId) {
          // signals dispatch starts before core dispatches the hop on the
          // main network; chains from signal handlers continue the cascade
          this._signals.enter(nextAc, {
            cascade: envelope.cascade,
            forward: meta.forward,
          });
        }
      },
    });
    this._undecorateSettle = this._signals.decorate({
      // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
      name: `transceiver-settle:${this._transceiverId}`,
      onReturn: (phase, value, ac, envelope) =>
        this._settle(phase, value, envelope.cascade),
    });
    this._timeoutMs = timeoutMs;
    this._promise = promise;
    this._cloneWithId = typeof id === 'function' ? id : undefined;
  }

  setCtx = ({ t, term, a, action, o, orient }, data) => {
    return this.setAppCtx(
      new AppCtx(term || t, action || a, orient || o, data),
    );
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
      this._surface.enter(ac, {
        cascade: transceiverControl(transceiverId, resolve, reject),
      });
    });
  };

  _settle(phase, value, control) {
    if (
      control.transceiverId !== this._transceiverId ||
      !control.signal ||
      control.signalled
    ) {
      return;
    }
    control.signalled = true;
    if (phase === INTERCEPT || phase === ERROR) {
      control.signal.reject(value);
    } else {
      control.signal.resolve(value);
    }
  }

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
