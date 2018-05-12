import cartesian from 'cartesian';
import { AppCtx } from '@tao.js/core';

const wrappedHandler = (Component, props, _provider) => (tao, data) => {
  _provider._current = {
    Component,
    tao,
    props: {
      ...props,
      ...data
    }
  };
};

class Provider {
  constructor(TAO) {
    this._tao = TAO;
    this._current = null;
    this._default = {};
    // this._taoIndex = new Map();
    this._components = new Map();
  }

  get current() {
    return this._current;
  }

  get defaultCtx() {
    return { ...this._default };
  }

  set defaultCtx({ term, action, orient } = {}) {
    this._default = { term, action, orient };
  }

  setDefaultCtx({ term, action, orient } = {}) {
    this.defaultCtx = { term, action, orient };
    return this;
  }

  addComponentHandler({ term, action, orient } = {}, Component, props) {
    const ctx = Object.assign(this.defaultCtx, { term, action, orient });
    const permutations = cartesian(ctx);
    const handler = wrappedHandler(Component, props, this);
    if (!this._components.has(Component)) {
      this._components.set(Component, {
        handlers: new Map(),
        index: new Map()
      });
    }
    const componentHandlers = this._components.get(Component);
    permutations.forEach(tao => {
      const { term, action, orient } = tao;
      const acKey = AppCtx.getKey(term, action, orient);
      if (!componentHandlers.index.has(acKey)) {
        componentHandlers.index.set(acKey, new AppCtx(term, action, orient));
      }
      const ac = componentHandlers.index.get(acKey);
      componentHandlers.handlers.set(ac, handler);
      this._tao.addInlineHandler(ac.unwrapCtx(), handler);
    });

    return this;
  }

  removeComponentHandler({ term, action, orient } = {}, Component) {
    if (!this._components.has(Component)) {
      return this;
    }
    const componentHandlers = this._components.get(Component);
    if (!term && !action && !orient) {
      // remove all handlers
      componentHandlers.handlers.forEach((ac, handler) => {
        this._tao.removeInlineHandler(ac.unwrapCtx(), handler);
      });
      this._components.delete(Component);
      return this;
    }
    const ctx = Object.assign(this.defaultCtx, { term, action, orient });
    const permutations = cartesian(ctx);
    permutations.forEach(({ term: t, action: a, orient: o }) => {
      const acKey = AppCtx.getKey(t, a, o);
      const ac = componentHandlers.index.get(acKey);
      if (!ac) {
        return;
      }
      componentHandlers.index.delete(acKey);
      if (!componentHandlers.handlers.has(ac)) {
        return;
      }
      const handler = componentHandlers.handlers.get(ac);
      this._tao.removeInlineHandler(ac.unwrapCtx(), handler);
      componentHandlers.handlers.delete(ac);
    });
    return this;
  }

  // registerReactor(reactor) {
  //   // DO I NEED THIS?
  // }

  // unregisterReactor(reactor) {
  //   // DO I NEED THIS?
  // }
}

export default Provider;
