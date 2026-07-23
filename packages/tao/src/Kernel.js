import Network from './Network';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import { _cleanAC } from './utils';

/** @typedef {import('./AppCtxRoot').Trigram} Trigram */
/** @typedef {import('./AppCtxHandlers').Handler} Handler */

/**
 * The app-facing veneer over a Network: signal Application Contexts
 * (`setCtx` / `setAppCtx`) and register handlers in the three phases
 * (intercept / async / inline). The default export of @tao.js/core is a
 * shared Kernel instance (`TAO`); create your own for isolation.
 */
export default class Kernel {
  /**
   * @param {boolean} [canSetWildcard=false] - allow wildcard AppCtxs to be
   *        set on (and chained within) this kernel; otherwise they are
   *        silently ignored
   */
  constructor(canSetWildcard = false) {
    this._network = new Network(canSetWildcard);
    this._canSetWildcard = canSetWildcard;
  }

  /** Whether wildcard AppCtxs may be set on this kernel. @returns {boolean} */
  get canSetWildcard() {
    return this._canSetWildcard;
  }

  /**
   * An independent Kernel whose Network has every handler registration
   * copied; decorations on the underlying Network are not copied.
   * @param {boolean} [canSetWildcard] - override for the clone; defaults to
   *        this kernel's setting
   * @returns {Kernel}
   */
  clone(canSetWildcard) {
    const cloned = new Kernel(
      typeof canSetWildcard !== 'undefined'
        ? canSetWildcard
        : this._canSetWildcard,
    );
    cloned._network = this._network.clone();
    return cloned;
  }

  /**
   * Signal an Application Context from trigram parts plus data. Wildcard
   * trigrams are silently ignored unless the kernel `canSetWildcard`.
   * @param {Trigram} trigram - both key styles accepted; long keys win
   * @param {*} [data] - context data; a single object is keyed per the
   *        AppCtx datum inference rules, an array is positional
   *        `[term, action, orient]` data
   * @returns {void}
   */
  setCtx({ t, term, a, action, o, orient }, data) {
    // get the hash for the ac
    const acIn = _cleanAC({ t, term, a, action, o, orient });
    const isWild = AppCtxRoot.isWildcard(acIn);
    if (!this._canSetWildcard && isWild) {
      // Ignore or Throw Error?
      return;
    }
    this._network.enter(new AppCtx(acIn.term, acIn.action, acIn.orient, data));
  }

  /**
   * Signal an already-constructed AppCtx. Wildcard AppCtxs are silently
   * ignored unless the kernel `canSetWildcard`.
   * @param {AppCtx} appCtx
   * @returns {void}
   * @throws {Error} when `appCtx` is not an AppCtx instance
   */
  setAppCtx(appCtx) {
    // Stryker disable next-line all: Network.enter throws the same error
    if (!(appCtx instanceof AppCtx)) {
      throw new Error(`'appCtx' not an instance of AppCtx`);
    }
    const isWild = appCtx.isWildcard;
    if (!this._canSetWildcard && isWild) {
      // Ignore or Throw Error?
      return;
    }
    this._network.enter(appCtx);
  }

  /**
   * Register an intercept-phase handler: runs first; a truthy return halts
   * the signal, an AppCtx return diverts it. Omitted trigram parts are
   * wildcards.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Kernel} this
   * @throws {Error} when `handler` is missing or not a function
   */
  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._network.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  /**
   * Register an async-phase handler: forked outside the caller's
   * synchronous flow after intercepts pass; may return an AppCtx to chain.
   * Omitted trigram parts are wildcards.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Kernel} this
   * @throws {Error} when `handler` is missing or not a function
   */
  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._network.addAsyncHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  /**
   * Register an inline-phase handler: runs in the caller's execution
   * context after async handlers are forked; returned AppCtxs are spooled,
   * then set. Omitted trigram parts are wildcards.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Kernel} this
   * @throws {Error} when `handler` is missing or not a function
   */
  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._network.addInlineHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  /**
   * Unregister an intercept-phase handler for a trigram.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Kernel} this
   * @throws {Error} when `handler` is missing or not a function
   */
  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  /**
   * Unregister an async-phase handler for a trigram.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Kernel} this
   * @throws {Error} when `handler` is missing or not a function
   */
  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  /**
   * Unregister an inline-phase handler for a trigram.
   * @param {Trigram} trigram
   * @param {Handler} handler
   * @returns {Kernel} this
   * @throws {Error} when `handler` is missing or not a function
   */
  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._network.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }
}
