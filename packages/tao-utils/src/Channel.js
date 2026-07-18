// import { Kernel } from '@tao.js/core';
import { AppCtx, Network } from '@tao.js/core';
import seive from './seive';

// for backwards compatibility
const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

let channelId = 0;
function newChannelId() {
  // Stryker disable next-line ArithmeticOperator,UpdateOperator: counter monotonicity/modulo wraparound at MAX_SAFE_INTEGER is untestable without exhausting the counter
  return (channelId = ++channelId % MAX_SAFE_INTEGER);
}

function channelControl(channelId) {
  return { channelId };
}

/**
 * Filters handling of AppCons to the set of attached handlers of the Channel for only those
 * AppCons that had a preceding AppCon originate from this Channel.
 *
 * Implemented as a Network decoration (see ENVELOPE-SPEC.md): the Channel
 * enters signals with a `{ channelId }` cascade and mirrors chained AppCons
 * of matching cascades onto its private network, where channel-attached
 * handlers run. Core owns main-network dispatch.
 *
 * @export
 * @class Channel
 */
export default class Channel {
  /**
   *Creates an instance of Channel.
   * @param {Kernel} kernel - an instance of a Kernel or other TAO Network on which to build a Channel by sharing the same underlying Network
   * @param {(string|function)} [id] - pass either a desired Channel ID value as a `string` or a `function` that will be used to generate a Channel ID
   *        the `function` will be called with a new Channel ID integer value to help ensure uniqueness
   * @param {boolean} [debug=false] - pass true to console.log internal activity
   * @memberof Channel
   */
  constructor(kernel, id, debug = false) {
    this._debug = debug;
    this._channelId =
      typeof id === 'function' ? id(newChannelId()) : id || newChannelId();
    this._channel = new Network();
    this._channel.use(this.handleAppCon);
    this._network = typeof kernel.use === 'function' ? kernel : kernel._network;
    if (typeof this._network.enter !== 'function') {
      throw new Error(
        'Channel requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    this._cloneWithId = typeof id === 'function' ? id : undefined;
    this._undecorate = this._network.decorate({
      // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
      name: `channel:${this._channelId}`,
      onForward: (nextAc, envelope) => {
        this._mirror(nextAc, envelope.cascade);
      },
    });
  }

  /**
   * Clones a Channel
   *
   * @param {(string|function)} [cloneId] - used as the cloned `Channel`'s ID,
   *          same as the `id` param to the `Channel` constructor, either an
   *          explicit value as a `string` or a `function` used to generate the Channel ID
   * @returns
   * @memberof Channel
   */
  clone(cloneId) {
    const clone = new Channel(
      { _network: this._network },
      cloneId || this._cloneWithId,
    );
    clone._channel = this._channel.clone();
    return clone;
  }

  use(middleware) {
    this._channel.use(middleware);
  }

  stop(middleware) {
    this._channel.stop(middleware);
  }

  /**
   * Detach this Channel's decoration from the shared network. Channel
   * handlers stop receiving mirrored AppCons; entries still dispatch.
   *
   * @memberof Channel
   */
  dispose() {
    this._undecorate();
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    this._network.enter(new AppCtx(term || t, action || a, orient || o, data), {
      cascade: channelControl(this._channelId),
    });
  }

  setCtxControl(
    { t, term, a, action, o, orient },
    data,
    control,
    forwardAppCtx,
  ) {
    const chanCtrl = channelControl(this._channelId);
    if (typeof forwardAppCtx === 'function') {
      // legacy caller-owned forwarding - frozen path (see ENVELOPE-SPEC.md)
      this._network.setCtxControl(
        { t, term, a, action, o, orient },
        data,
        { ...control, ...chanCtrl },
        (ac, fwdControl) => {
          this.forwardAppCtx(ac, fwdControl);
          forwardAppCtx(ac, fwdControl);
        },
      );
      return;
    }
    this._network.enter(new AppCtx(term || t, action || a, orient || o, data), {
      cascade: { ...control, ...chanCtrl },
    });
  }

  setAppCtx(ac) {
    this._network.enter(ac, { cascade: channelControl(this._channelId) });
  }

  setAppCtxControl(ac, control, forwardAppCtx) {
    const chanCtrl = channelControl(this._channelId);
    if (typeof forwardAppCtx === 'function') {
      // legacy caller-owned forwarding - frozen path (see ENVELOPE-SPEC.md)
      this._network.setAppCtxControl(
        ac,
        { ...control, ...chanCtrl },
        (fwdAc, fwdControl) => {
          this.forwardAppCtx(fwdAc, fwdControl);
          forwardAppCtx(fwdAc, fwdControl);
        },
      );
      return;
    }
    this._network.enter(ac, { cascade: { ...control, ...chanCtrl } });
  }

  /**
   * Legacy-path forwarding (callers that own their `forwardAppCtx`). v2
   * cascades are mirrored by the Channel's decoration instead.
   *
   * @memberof Channel
   */
  forwardAppCtx(ac, control) {
    // Stryker disable all: optional debug logging
    this._debug &&
      console.log(
        `channel{${this._channelId}}::forwardAppCtx::ac:`,
        ac.unwrapCtx(),
      );
    this._debug &&
      console.log(
        `channel{${this._channelId}}::forwardAppCtx::control:`,
        control,
      );
    // Stryker restore all
    this._mirror(ac, control);
    this._network.setAppCtxControl(ac, control, (a, c) =>
      this.forwardAppCtx(a, c),
    );
  }

  _mirror(ac, control) {
    if (control.channelId === this._channelId) {
      // Stryker disable all: optional debug logging
      this._debug &&
        console.log(
          `channel{${this._channelId}}::mirroring::ac:`,
          ac.unwrapCtx(),
        );
      // Stryker restore all
      this._channel.setAppCtxControl(ac, control, (a) => this.setAppCtx(a));
    }
  }

  handleAppCon(handler, ac, forwardAppCtx, control) {
    return handler.handleAppCon(ac, forwardAppCtx, control);
  }

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addAsyncHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInlineHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  bridgeFrom(TAO, ...trigrams) {
    return seive(
      this._channelId,
      TAO,
      this,
      (ac, control) => control.channelId !== this._channelId,
      ...trigrams,
    );
  }
}
