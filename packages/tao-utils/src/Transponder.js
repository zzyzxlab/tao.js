import { Network } from '@tao.js/core';

let transponderId = 0;
function newTransponderId() {
  return ++transponderId;
}

function transponderControl(transponderId, signal) {
  return { transponderId, signal };
}

export default class Transponder {
  // constructor(kernel, id, first = true, timeoutMs = 0) {
  constructor(kernel, id, timeoutMs = 0) {
    this._transponderId = id || newTransponderId();
    this._timeoutMs = +timeoutMs || 0;
    this._channel = new Network();
    // if (first) {
    this._channel.use(this.handleSignalAppCon);
    // } else {
    //   this._channel.use(this.handleSignalLastAppCon);
    // }
    this._network = kernel._network;
  }

  clone(cloneId) {
    const clone = new Transponder({ _network: this._network }, cloneId);
    clone._channel = this._channel;
    return clone;
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    const transponderId = this._transponderId;
    const timeoutMs = this._timeoutMs;

    return new Promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(`reached timeout of: ${timeoutMs}ms`);
        }, timeoutMs);
      }
      const control = transponderControl(transponderId, resolve);
      this._network.setCtxControl(
        { t, term, a, action, o, orient },
        data,
        control,
        this.forwardAppCtx
      );
    });
  }

  setAppCtx(ac) {
    const transponderId = this._transponderId;
    const timeoutMs = this._timeoutMs;

    return new Promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(`reached timeout of: ${timeoutMs}ms`);
        }, timeoutMs);
      }
      const control = transponderControl(transponderId, resolve);
      this._network.setAppCtxControl(ac, control, this.forwardAppCtx);
    });
  }

  forwardAppCtx = (ac, control) => {
    console.log(
      `transponder{${this._transponderId}}::forwardAppCtx::ac:`,
      ac.unwrapCtx()
    );
    console.log(
      `transponder{${this._transponderId}}::forwardAppCtx::control:`,
      control
    );
    if (control.transponderId === this._transponderId) {
      console.log(
        `transponder{${
          this._transponderId
        }}::forwardAppCtx::control check passed`
      );
      this._channel.setAppCtxControl(ac, control, this.forwardAppCtx);
    }
    console.log(
      `transponder{${
        this._transponderId
      }}::forwardAppCtx::calling network.setAppCtxControl`
    );
    this._network.setAppCtxControl(ac, control, this.forwardAppCtx);
  };

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
    if (control.transponderId === this._transponderId && control.signal) {
      control.signal(ac);
    }
    return handler.handleAppCon(ac, forwardAppCtx, control);
  };

  // handleSignalLastAppCon = (handler, ac, forwardAppCtx, control) => {
  //   // handle the ac using the network first
  //   console.log(`transponder{${this._transponderId}}::handleSignalLastAppCon::ac:`, ac.unwrapCtx());
  //   console.log(`transponder{${this._transponderId}}::handleSignalLastAppCon::control:`, control);
  //   const rv = handler.handleAppCon(ac, forwardAppCtx, control);
  //   // last matching handler will signal the listener
  //   if (control.transponderId === this._transponderId && control.signal) {
  //     console.log(`transponder{${this._transponderId}}::handleSignalLastAppCon::signaling:`, ac.unwrapCtx());
  //     control.signal(ac);
  //   }
  //   return rv;
  // }

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addAsyncHandler({ t, term, a, action, o, orient }, handler);
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInlineHandler({ t, term, a, action, o, orient }, handler);
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler
    );
  }
}
