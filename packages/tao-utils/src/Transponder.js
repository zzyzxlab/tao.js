import { Network } from '@tao.js/core';

// for backwards compatibility
const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

let transponderId = 0;
function newTransponderId() {
  return (transponderId = ++transponderId % MAX_SAFE_INTEGER);
}

function transponderControl(transponderId, signal) {
  return { transponderId, signal };
}

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
 * @export
 * @class Transponder
 */
export default class Transponder {
  /**
   *Creates an instance of Transponder.
   * @param {Network} network - the `Network` to wrap with a `Transponder`
   * @param {(string|function)} [id] - pass either a desired Channel ID value as a `string` or a `function` that will be used to generate a Channel ID
   *        the `function` will be called with a new Channel ID integer value to help ensure uniqueness
   * @param {number} [timeoutMs=0] - a timeout to be used when awaiting `Promises`
   *        - `0` - no timeout will be used
   *        - `> 0` - timeout will be used to `reject` the `Promise` if it is not signaled in time
   *        - use this to prevent unexpected behaviors
   * @param {Thenable} [promise=Promise] - a `Promise` constructor to be used when creating promises
   *        by a signalling method.
   * @memberof Transponder
   */
  constructor(network, id, timeoutMs = 0, promise = Promise) {
    this._transponderId =
      typeof id === 'function'
        ? id(newTransponderId())
        : id || newTransponderId();
    const inTO = +timeoutMs || 0;
    this._timeoutMs = inTO > 0 ? inTO : 0;
    this._network =
      typeof network.use === 'function' ? network : network._network;
    this._network.use(this.handleSignalAppCon);
    this._promise = promise;
    this._cloneWithId = typeof id === 'function' ? id : undefined;
  }

  clone(cloneId) {
    const clone = new Transponder(
      this._network,
      cloneId || this._cloneWithId,
      this._timeoutMs,
      this._promise
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
   * @returns this
   * @memberof Transponder
   */
  attach() {
    this._network.use(this.handleSignalAppCon);
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
   * @returns this
   * @memberof Transponder
   */
  detach() {
    this._network.stop(this.handleSignalAppCon);
    return this;
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    const transponderId = this._transponderId;
    const timeoutMs = this._timeoutMs;
    const promise = this._promise;

    return new promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(`reached timeout of: ${timeoutMs}ms`);
        }, timeoutMs);
      }
      const control = transponderControl(transponderId, resolve);
      this._network.setCtxControl(
        { t, term, a, action, o, orient },
        data,
        control
      );
    });
  }

  setAppCtx(ac) {
    const transponderId = this._transponderId;
    const timeoutMs = this._timeoutMs;
    const promise = this._promise;

    return new promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(`reached timeout of: ${timeoutMs}ms`);
        }, timeoutMs);
      }
      const control = transponderControl(transponderId, resolve);
      this._network.setAppCtxControl(ac, control);
    });
  }

  handleSignalAppCon = (handler, ac, forwardAppCtx, control) => {
    console.log(
      `transponder{${this._transponderId}}::handleSignalFirstAppCon::ac:`,
      ac.unwrapCtx()
    );
    console.log(
      `transponder{${this._transponderId}}::handleSignalFirstAppCon::control:`,
      control
    );
    // first matching handler will signal the listener
    if (
      control.transponderId === this._transponderId &&
      control.signal &&
      !control.signalled
    ) {
      control.signalled = true;
      control.signal(ac);
    }
    // ALERT: handler will have already handled the AppCon before now
    // return handler.handleAppCon(ac, forwardAppCtx, control);
  };
}
