// import { Kernel } from '@tao.js/core';
import { Network } from '@tao.js/core';

let channelId = 0;
function newChannelId() {
  return ++channelId;
}

function channelControl(channelId) {
  return { channelId };
}

export default class Channel {
  constructor(kernel, id) {
    //, { t, term, a, action, o, orient }) {
    this._channelId = id || newChannelId();
    this._channel = new Network();
    this._channel.use(this.handleAppCon);
    // this._kernel = new Kernel(kernel.canSetWildcard);
    this._network = kernel._network;
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
      // this._kernel.setAppCtx(ac);
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
    // this._kernel.addInterceptHandler(
    this._channel.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    // this._kernel.addAsyncHandler({ t, term, a, action, o, orient }, handler);
    this._channel.addAsyncHandler({ t, term, a, action, o, orient }, handler);
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    // this._kernel.addInlineHandler({ t, term, a, action, o, orient }, handler);
    this._channel.addInlineHandler({ t, term, a, action, o, orient }, handler);
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    // this._kernel.removeInterceptHandler(
    this._channel.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    // this._kernel.removeAsyncHandler({ t, term, a, action, o, orient }, handler);
    this._channel.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    // this._kernel.removeInlineHandler(
    this._channel.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }
}
