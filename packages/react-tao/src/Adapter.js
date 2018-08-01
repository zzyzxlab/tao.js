import cartesian from 'cartesian';
import { Component } from 'react';
import { AppCtx } from '@tao.js/core';

const noop = () => {};

const cleanInput = ({ term, action, orient }) => {
  const incoming = { term, action, orient };
  Object.keys(incoming).forEach(k => incoming[k] == null && delete incoming[k]);
  return incoming;
};

const wrappedHandler = (ComponentHandler = null, props, _adapter) => (
  tao,
  data
) => {
  _adapter._current = {
    ComponentHandler,
    tao,
    props: {
      ...props,
      ...data
    }
  };
  _adapter._reactors.forEach(notify => notify());
};

class Adapter {
  constructor(TAO) {
    this._tao = TAO;
    this._current = null;
    this._default = {};
    this._reactors = new Map();
    this._components = new Map();
  }

  get current() {
    return this._current;
  }

  get defaultCtx() {
    return { ...this._default };
  }

  set defaultCtx({ term, action, orient } = {}) {
    this._default = cleanInput({ term, action, orient });
  }

  setDefaultCtx({ term, action, orient } = {}) {
    this.defaultCtx = { term, action, orient };
    return this;
  }

  addComponentHandler({ term, action, orient } = {}, ComponentHandler, props) {
    if (
      ComponentHandler &&
      !(
        ComponentHandler instanceof Component ||
        ComponentHandler instanceof Function
      )
    ) {
      throw new Error(
        'cannot add a Component handler that is not a React.Component or Function'
      );
    }
    const tao = cleanInput({ term, action, orient });
    const ctx = Object.assign(this.defaultCtx, tao);
    const permutations = cartesian(ctx);
    if (!permutations.length) {
      return this;
    }
    const handler = wrappedHandler(ComponentHandler, props, this);
    if (!this._components.has(ComponentHandler)) {
      this._components.set(ComponentHandler, {
        handlers: new Map(),
        index: new Map()
      });
    }
    const componentHandlers = this._components.get(ComponentHandler);
    permutations.forEach(tao => {
      const { term, action, orient } = tao;
      const acKey = AppCtx.getKey(term, action, orient);
      if (!componentHandlers.index.has(acKey)) {
        componentHandlers.index.set(acKey, new AppCtx(term, action, orient));
      }
      const ac = componentHandlers.index.get(acKey);
      if (!componentHandlers.handlers.has(ac)) {
        componentHandlers.handlers.set(ac, handler);
        this._tao.addInlineHandler(ac.unwrapCtx(), handler);
      }
    });

    return this;
  }

  removeComponentHandler({ term, action, orient } = {}, ComponentHandler) {
    if (!this._components.has(ComponentHandler)) {
      return this;
    }
    const componentHandlers = this._components.get(ComponentHandler);
    if (!term && !action && !orient) {
      // remove all handlers
      for (let [ac, handler] of componentHandlers.handlers) {
        this._tao.removeInlineHandler(ac.unwrapCtx(), handler);
      }
      this._components.delete(ComponentHandler);
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
      // currently cannot hit this guard
      // if (!componentHandlers.handlers.has(ac)) {
      //   return;
      // }
      const handler = componentHandlers.handlers.get(ac);
      this._tao.removeInlineHandler(ac.unwrapCtx(), handler);
      componentHandlers.handlers.delete(ac);
    });
    return this;
  }

  registerReactor(reactor, notify = noop) {
    this._reactors.set(reactor, notify);
  }

  unregisterReactor(reactor) {
    this._reactors.delete(reactor);
  }
}

export default Adapter;
