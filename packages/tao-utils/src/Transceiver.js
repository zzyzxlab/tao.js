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
 * A trigram matcher in short (`t`/`a`/`o`) or long (`term`/`action`/`orient`)
 * keys; omitted parts are wildcards.
 *
 * @typedef {Object} Trigram
 * @property {string} [t] - term (short key)
 * @property {string} [term] - term (long key)
 * @property {string} [a] - action (short key)
 * @property {string} [action] - action (long key)
 * @property {string} [o] - orient (short key)
 * @property {string} [orient] - orient (long key)
 */

/**
 * A TAO signal handler: called with the concrete trigram handled and the
 * signal's datagram(s); returning an `AppCtx` chains it (see `@tao.js/core`).
 *
 * @callback SignalHandler
 * @param {Object} tao - the concrete `{ t, a, o }` trigram handled
 * @param {*} data - the signal's datagram(s)
 * @returns {(AppCtx|*)}
 */

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
  /**
   * Creates an instance of Transceiver.
   *
   * Surface resolution follows the utils convention
   * (`typeof network.enter === 'function' ? network : network._network`):
   * pass anything exposing the envelope gate directly (a `Network`, or a
   * `Channel` — entries then keep channel affinity), or a Kernel-shaped
   * wrapper exposing `_network`. The resolved surface must support `enter`
   * and `decorate`.
   *
   * Two decorations are registered: an `onForward` mirror on the underlying
   * shared network (`surface._network || surface` — chained hops are
   * observed there even when entries go through a Channel surface),
   * self-filtered on `envelope.cascade.transceiverId`, mirroring matching
   * chained AppCons onto the private signals network; and an `onReturn`
   * settlement decoration on the signals network mapping signal-handler
   * returns onto the Promise (see {@linkcode setAppCtx}).
   *
   * @param {(Kernel|Network|Channel)} network - the surface to wrap with a `Transceiver`
   * @param {(string|function(number): (string|number))} [id] - pass either a desired Transceiver ID value as a `string` or a `function` that will be used to generate a Transceiver ID
   *        the `function` will be called with a new Transceiver ID integer value to help ensure uniqueness
   * @param {number} [timeoutMs=0] - a timeout to be used when awaiting `Promises`
   *        - `0` - no timeout will be used
   *        - `> 0` - timeout will be used to `reject` the `Promise` if it is not signaled in time
   * @param {PromiseConstructor} [promise=Promise] - a `Promise` constructor to be used when creating promises
   *        by a signalling method.
   * @throws {Error} when the resolved surface lacks envelope support
   *         (`enter` + `decorate`) - upgrade `@tao.js/core`
   * @memberof Transceiver
   */
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
          // same-hop dispatch (envelope verbatim): signals dispatch starts
          // before core dispatches the hop on the main network; chains from
          // signal handlers continue the cascade
          this._signals.mirror(nextAc, envelope, meta.forward);
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

  /**
   * Builds an AppCtx from a trigram + datagram (long-form keys win) and
   * signals it via {@linkcode setAppCtx}.
   *
   * @param {Trigram} trigram
   * @param {*} data - datagram(s) for the signal
   * @param {Object} [opts] - as {@linkcode setAppCtx}
   * @param {(Object|null)} [opts.chain] - prior chain state to continue
   * @returns {Promise<*>} as {@linkcode setAppCtx}
   * @memberof Transceiver
   */
  setCtx = ({ t, term, a, action, o, orient }, data, opts) => {
    return this.setAppCtx(
      new AppCtx(term || t, action || a, orient || o, data),
      opts,
    );
  };

  /**
   * Enters the AppCtx on the wrapped surface with this Transceiver's
   * `{ transceiverId, signal }` cascade tag — the cascade (control) object
   * is one shared reference for the whole cascade, so descendants of the
   * entry are mirrored onto the signals network wherever the chain goes.
   *
   * Settlement semantics: signal handlers observe the mirrored descendants
   * (never the entry hop itself) and their non-AppCtx returns settle the
   * Promise through the signals network's `onReturn` hook — phase mapping:
   * INTERCEPT (truthy return) and ERROR (thrown error / rejected async)
   * reject; ASYNC and INLINE (non-null return) resolve. First settlement
   * wins: it stamps `signalled` on the shared cascade and later returns are
   * ignored. AppCtx returns chain like any handler's (continuing the
   * cascade through the main network's hop engine) instead of settling.
   * With no settling handler the Promise stays pending unless a `timeoutMs`
   * was configured.
   *
   * @param {AppCtx} ac
   * @param {Object} [opts]
   * @param {(Object|null)} [opts.chain] - prior chain state to continue (e.g. a
   *        remote trace received over a transport — ENVELOPE-SPEC.md §9)
   * @returns {Promise<*>} settled by the attached signal handlers; rejects
   *          with the string `reached timeout of: <ms>ms` when a
   *          `timeoutMs` was configured and no settlement arrived in time
   * @memberof Transceiver
   */
  setAppCtx = (ac, { chain = null } = {}) => {
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
        chain,
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

  /**
   * Attaches a signal handler — an InlineHandler on the private signals
   * network, alias of {@linkcode addInlineHandler} — for matching AppCons
   * mirrored to this Transceiver. Its return value settles the Promise as
   * described on {@linkcode setAppCtx}; remove with
   * {@linkcode removeInlineHandler}.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {void}
   * @memberof Transceiver
   */
  addSignalHandler = ({ t, term, a, action, o, orient }, handler) => {
    this._signals.addInlineHandler({ t, term, a, action, o, orient }, handler);
  };

  /**
   * Attaches an InterceptHandler to the private signals network — a truthy
   * non-AppCtx return rejects the Promise; a thrown error rejects it.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {void}
   * @memberof Transceiver
   */
  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
  }

  /**
   * Attaches an AsyncHandler to the private signals network — a non-null
   * non-AppCtx return resolves the Promise; a thrown error or rejection
   * rejects it.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {void}
   * @memberof Transceiver
   */
  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.addAsyncHandler({ t, term, a, action, o, orient }, handler);
  }

  /**
   * Attaches an InlineHandler to the private signals network — a non-null
   * non-AppCtx return resolves the Promise; a thrown error rejects it.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {void}
   * @memberof Transceiver
   */
  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.addInlineHandler({ t, term, a, action, o, orient }, handler);
  }

  /**
   * Removes an InterceptHandler previously attached for the same trigram.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {void}
   * @memberof Transceiver
   */
  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
  }

  /**
   * Removes an AsyncHandler previously attached for the same trigram.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {void}
   * @memberof Transceiver
   */
  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler,
    );
  }

  /**
   * Removes an InlineHandler previously attached for the same trigram
   * (including handlers attached via {@linkcode addSignalHandler}).
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {void}
   * @memberof Transceiver
   */
  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._signals.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler,
    );
  }
}
