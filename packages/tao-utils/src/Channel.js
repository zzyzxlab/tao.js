import { Kernel } from '@tao.js/core';

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
    this._kernel = new Kernel(kernel.canSetWildcard);
    this._network = kernel._network;
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    this._network.setCtxControl(
      { t, term, a, action, o, orient },
      data,
      channelControl(this._channelId),
      (ac, control, handle) => this.forwardAppCtx(ac, control, handle)
    );
  }

  setAppCtx(ac) {
    this._network.setAppCtxControl(
      ac,
      channelControl(this._channelId),
      (ac, control, handle) => this.forwardAppCtx(ac, control, handle)
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
      this._kernel.setAppCtx(ac);
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

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._kernel.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._kernel.addAsyncHandler({ t, term, a, action, o, orient }, handler);
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._kernel.addInlineHandler({ t, term, a, action, o, orient }, handler);
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._kernel.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._kernel.removeAsyncHandler({ t, term, a, action, o, orient }, handler);
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._kernel.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }
}
