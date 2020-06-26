// import { Kernel } from '@tao.js/core';
import { Network } from '@tao.js/core';
import seive from './seive';

// for backwards compatibility
const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

let channelId = 0;
function newChannelId() {
  return (channelId = ++channelId % MAX_SAFE_INTEGER);
}

function channelControl(channelId) {
  return { channelId };
}

export default class Channel {
  /**
   *Creates an instance of Channel.
   * @param {Kernel} kernel - an instance of a Kernel or other TAO Network on which to build a Channel by sharing the same underlying Network
   * @param {(string|function)} [id] - pass either a desired Channel ID value as a `string` or a `function` that will be used to generate a Channel ID
   *        the `function` will be called with a new Channel ID integer value to help ensure uniqueness
   * @memberof Channel
   */
  constructor(kernel, id) {
    this._channelId =
      typeof id === 'function' ? id(newChannelId()) : id || newChannelId();
    this._channel = new Network();
    this._channel.use(this.handleAppCon);
    this._network = kernel._network;
    this._cloneWithId = typeof id === 'function' ? id : undefined;
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
      cloneId || this._cloneWithId
    );
    clone._channel = this._channel;
    return clone;
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    this._network.setCtxControl(
      { t, term, a, action, o, orient },
      data,
      channelControl(this._channelId),
      (ac, control) => this.forwardAppCtx(ac, control)
    );
  }

  setAppCtx(ac) {
    this._network.setAppCtxControl(
      ac,
      channelControl(this._channelId),
      (ac, control) => this.forwardAppCtx(ac, control)
    );
  }

  forwardAppCtx(ac, control) {
    console.log(
      `channel{${this._channelId}}::forwardAppCtx::ac:`,
      ac.unwrapCtx()
    );
    console.log(
      `channel{${this._channelId}}::forwardAppCtx::control:`,
      control
    );
    if (control.channelId === this._channelId) {
      console.log(
        `channel{${this._channelId}}::forwardAppCtx::control check passed`
      );
      this._channel.setAppCtxControl(ac, control, a => this.setAppCtx(a));
    }
    console.log(
      `channel{${
        this._channelId
      }}::forwardAppCtx::calling network.setAppCtxControl`
    );
    this._network.setAppCtxControl(ac, control, (a, c) =>
      this.forwardAppCtx(a, c)
    );
  }

  handleAppCon(handler, ac, forwardAppCtx, control) {
    return handler.handleAppCon(ac, forwardAppCtx, control);
  }

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler
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
      handler
    );
    return this;
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler
    );
    return this;
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler
    );
    return this;
  }

  bridgeFrom(TAO, ...trigrams) {
    return seive(
      this._channelId,
      TAO,
      this,
      (ac, control) => control.channelId !== this._channelId,
      ...trigrams
    );
  }
}
