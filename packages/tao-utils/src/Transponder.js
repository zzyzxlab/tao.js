import { AppCtx } from '@tao.js/core';

// for backwards compatibility
const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

let transponderId = 0;
function newTransponderId() {
  // Stryker disable next-line ArithmeticOperator,UpdateOperator: counter monotonicity/modulo wraparound at MAX_SAFE_INTEGER is untestable without exhausting the counter
  return (transponderId = ++transponderId % MAX_SAFE_INTEGER);
}

function transponderControl(transponderId, signal) {
  return { transponderId, signal };
}

/**
 * A trigram in short (`t`/`a`/`o`) or long (`term`/`action`/`orient`) keys;
 * long-form keys win.
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
 * Allows use of Promises with a Network by returning a Promise from a signalling method
 * that will only resolve based on one of the handlers attached to the wrapped Network
 * being called.
 *
 * It is not recommended to attach a Transponder to your primary Network or Kernel as this will
 * resolve Promises with the first AppCon handled (unless that is the desired behavior).
 *
 * It is recommended to attach a Transponder to one of the other `utils` classes that filter
 * or have a subset of the handlers of your primary Network like a Channel.
 *
 * Implemented as an `onDispatch` decoration on the wrapped surface (a raw
 * Network/Kernel network, or a Channel's private network via
 * `Channel.decorate`), self-filtered on `envelope.cascade.transponderId`.
 * The transponder tag rides the cascade scope of the envelope, so it
 * survives every hop of a chain (see ENVELOPE-SPEC.md); resolve-once is
 * enforced by stamping `signalled` on the shared cascade reference.
 *
 * @export
 * @class Transponder
 */
export default class Transponder {
  /**
   *Creates an instance of Transponder.
   *
   * Surface resolution follows the utils convention
   * (`typeof network.enter === 'function' ? network : network._network`):
   * pass anything exposing the envelope gate directly (a `Network`, or a
   * `Channel` — whose `enter`/`decorate` scope this Transponder to the
   * channel), or a Kernel-shaped wrapper exposing `_network`. The resolved
   * surface must support `enter` and `decorate`.
   *
   * @param {(Kernel|Network|Channel)} network - the surface to wrap with a `Transponder`
   * @param {(string|function(number): (string|number))} [id] - pass either a desired Transponder ID value as a `string` or a `function` that will be used to generate a Transponder ID
   *        the `function` will be called with a new Transponder ID integer value to help ensure uniqueness
   * @param {number} [timeoutMs=0] - a timeout to be used when awaiting `Promises`
   *        - `0` - no timeout will be used
   *        - `> 0` - timeout will be used to `reject` the `Promise` if it is not signaled in time
   *        - use this to prevent unexpected behaviors
   *        - negative and non-numeric values clamp to `0`
   * @param {PromiseConstructor} [promise=Promise] - a `Promise` constructor to be used when creating promises
   *        by a signalling method.
   * @param {boolean} [debug=false] - pass true to console.log internal activity
   * @throws {Error} when the resolved surface lacks envelope support
   *         (`enter` + `decorate`) - upgrade `@tao.js/core`
   * @memberof Transponder
   */
  constructor(network, id, timeoutMs = 0, promise = Promise, debug = false) {
    this._debug = debug;
    this._transponderId =
      typeof id === 'function'
        ? id(newTransponderId())
        : id || newTransponderId();
    const inTO = +timeoutMs || 0;
    // Stryker disable next-line EqualityOperator: equivalent - `inTO || 0` above already coerces -0/NaN to 0, so for every remaining value `inTO > 0` and `inTO >= 0` pick the same branch (0 stays 0 either way)
    this._timeoutMs = inTO > 0 ? inTO : 0;
    this._network =
      typeof network.enter === 'function' ? network : network._network;
    if (
      !this._network ||
      typeof this._network.enter !== 'function' ||
      typeof this._network.decorate !== 'function'
    ) {
      throw new Error(
        'Transponder requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    this._decoration = {
      // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
      name: `transponder:${this._transponderId}`,
      onDispatch: (ac, envelope) =>
        this.handleSignalAppCon(ac, envelope.cascade),
    };
    this._undecorate = this._network.decorate(this._decoration);
    this._promise = promise;
    this._cloneWithId = typeof id === 'function' ? id : undefined;
  }

  /**
   * Clones a Transponder on the same wrapped surface with the same timeout,
   * Promise constructor and debug settings. The clone registers its own
   * decoration under its own Transponder ID.
   *
   * @param {(string|function(number): (string|number))} [cloneId] - used as the cloned
   *        `Transponder`'s ID, same as the `id` param to the constructor;
   *        falls back to the constructor's `id` generator when one was given
   * @returns {Transponder} the cloned Transponder
   * @memberof Transponder
   */
  clone(cloneId) {
    const clone = new Transponder(
      this._network,
      cloneId || this._cloneWithId,
      this._timeoutMs,
      this._promise,
      this._debug,
    );
    return clone;
  }

  /**
   * Attaches the `Transponder` to the `Network` it wraps by enabling the signalling to any
   * `Promises` that are created using one of the signalling methods.
   *
   * This is the inverse operation of the {@linkcode detach()} method and used to undo that
   * operation.
   *
   * `attach()` is unnecessary unless {@linkcode detach()} has been called as a newly
   * constructed `Transponder` is always attached to the `Network` it wraps.
   *
   * @see {@link detach}
   *
   * @returns {Transponder} this
   * @memberof Transponder
   */
  attach() {
    // Stryker disable next-line ConditionalExpression: guard keeps attach idempotent; double-decorating would only duplicate a first-wins signal
    if (!this._undecorate) {
      this._undecorate = this._network.decorate(this._decoration);
    }
    return this;
  }

  /**
   * Detaches the `Transponder` from the `Network` it wraps by disabling the signaling to any
   * `Promises` that are created using one of the signalling methods.
   *
   * Detach is temporary and can be reestablished using the {@link attach()} method.
   *
   * @see {@link attach()}
   *
   * @returns {Transponder} this
   * @memberof Transponder
   */
  detach() {
    if (this._undecorate) {
      this._undecorate();
      this._undecorate = null;
    }
    return this;
  }

  /**
   * Builds an AppCtx from a trigram + datagram (long-form keys win) and
   * signals it via {@linkcode setAppCtx}.
   *
   * @param {Trigram} trigram
   * @param {*} data - datagram(s) for the signal
   * @param {Object} [opts] - as {@linkcode setAppCtx}
   * @param {(Object|null)} [opts.chain] - prior chain state to continue
   * @returns {Promise<AppCtx>} as {@linkcode setAppCtx}
   * @memberof Transponder
   */
  setCtx({ t, term, a, action, o, orient }, data, opts) {
    return this.setAppCtx(
      new AppCtx(term || t, action || a, orient || o, data),
      opts,
    );
  }

  /**
   * Enters the AppCtx on the wrapped surface with this Transponder's
   * `{ transponderId, signal }` cascade tag — the cascade (control) object
   * is one shared reference for the whole cascade, so the tag survives
   * every hop of a chain.
   *
   * Resolution semantics: the Promise resolves with the first AppCon the
   * Transponder's decoration observes dispatching for this cascade — the
   * first handled AppCon of the cascade. Attached to a bare Network/Kernel
   * that is the entered AppCtx itself; attached to a Channel (the
   * decoration observes the channel's private network) it is the first
   * descendant mirrored onto the channel — the entry hop itself is not
   * mirrored. Resolve-once: the first signal stamps `signalled` on the
   * shared cascade, so later dispatches of the same cascade never signal
   * again and the Promise settles at most once.
   *
   * @param {AppCtx} ac
   * @param {Object} [opts]
   * @param {(Object|null)} [opts.chain] - prior chain state to continue (e.g. a
   *        remote trace received over a transport — ENVELOPE-SPEC.md §9)
   * @returns {Promise<AppCtx>} resolves with the first handled AppCon of the
   *          cascade; rejects with the string `reached timeout of: <ms>ms`
   *          when a `timeoutMs` was configured and no signal arrived in time
   * @memberof Transponder
   */
  setAppCtx(ac, { chain = null } = {}) {
    const transponderId = this._transponderId;
    const timeoutMs = this._timeoutMs;
    const promise = this._promise;

    return new promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(`reached timeout of: ${timeoutMs}ms`);
        }, timeoutMs);
      }
      this._network.enter(ac, {
        cascade: transponderControl(transponderId, resolve),
        chain,
      });
    });
  }

  /**
   * `onDispatch` decoration callback: signals the awaiting Promise with the
   * first dispatched AppCon of a matching cascade. Self-filtered on
   * `control.transponderId`; resolve-once is enforced by stamping
   * `signalled` on the shared cascade control.
   *
   * @param {AppCtx} ac
   * @param {Object} control - the envelope's cascade scope
   *        (`{ transponderId, signal, signalled }`)
   * @returns {void}
   * @memberof Transponder
   */
  handleSignalAppCon = (ac, control) => {
    // Stryker disable all: optional debug logging
    this._debug &&
      console.log(
        `transponder{${this._transponderId}}::handleSignalFirstAppCon::ac:`,
        ac.unwrapCtx(),
      );
    this._debug &&
      console.log(
        `transponder{${
          this._transponderId
        }}::handleSignalFirstAppCon::control:`,
        control,
      );
    // Stryker restore all
    // first matching handler will signal the listener
    if (
      control.transponderId === this._transponderId &&
      control.signal &&
      !control.signalled
    ) {
      control.signalled = true;
      control.signal(ac);
    }
  };
}
