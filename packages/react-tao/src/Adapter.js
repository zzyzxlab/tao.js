import cartesian from 'cartesian';
import React from 'react';
import { AppCtx } from '@tao.js/core';

import { noop, normalizeClean } from './helpers';

/** @typedef {import('@tao.js/core').Kernel} Kernel */
/** @typedef {import('@tao.js/core').Handler} Handler */
/** @typedef {import('./helpers').TrigramProps} TrigramProps */
/** @typedef {import('./helpers').NormalizedTrigram} NormalizedTrigram */
/** @typedef {import('./helpers').TaoSignal} TaoSignal */

/**
 * Snapshot of the latest matched component handler, rendered by `Reactor`.
 * @typedef {Object} AdapterCurrent
 * @property {import('react').ComponentType<*>|null} ComponentHandler - the
 *           component registered for the matched trigram (`null` renders
 *           nothing)
 * @property {TaoSignal} tao - trigram of the AppCon that fired
 * @property {Object<string, *>} props - registration props merged with the
 *           AppCon data
 */

/**
 * @param {import('react').ComponentType<*>|null} ComponentHandler
 * @param {Object<string, *>} props
 * @param {Adapter} _adapter
 * @returns {Handler}
 */
const wrappedHandler =
  (ComponentHandler = null, props, _adapter) =>
  (tao, data) => {
    _adapter._current = {
      ComponentHandler,
      tao,
      props: {
        ...props,
        ...data,
      },
    };
    _adapter._reactors.forEach((notify) => notify());
  };

/**
 * Original ("orig" entry) API: registers React components as inline handlers
 * on a Kernel and tracks the latest match for a `Reactor` to render.
 * Legacy — prefer the current component/hook API from the package root.
 */
class Adapter {
  /**
   * @param {Kernel} TAO - the Kernel to register inline handlers on
   */
  constructor(TAO) {
    this._tao = TAO;
    /** @type {?AdapterCurrent} */
    this._current = null;
    /** @type {NormalizedTrigram} */
    this._default = {};
    /** @type {Map<object, () => void>} */
    this._reactors = new Map();
    /** @type {Map<*, {handlers: Map<AppCtx, Handler>, index: Map<string, AppCtx>}>} */
    this._components = new Map();
  }

  /**
   * The latest matched component snapshot, or `null` before any match.
   * @returns {?AdapterCurrent}
   */
  get current() {
    return this._current;
  }

  /**
   * Copy of the default trigram parts merged under every add/remove call.
   * @returns {NormalizedTrigram}
   */
  get defaultCtx() {
    return { ...this._default };
  }

  /**
   * Set the default trigram parts (short/long keys, arrays allowed;
   * assigning `undefined` resets to empty).
   * @param {TrigramProps} trigramProps
   */
  // @ts-ignore TS1052 — the `= {}` initializer is valid JS (assigning `undefined` resets the default, asserted in tests)
  set defaultCtx({ t, term, a, action, o, orient } = {}) {
    this._default = normalizeClean({ t, term, a, action, o, orient });
  }

  /**
   * Chainable form of the `defaultCtx` setter.
   * @param {TrigramProps} [trigramProps]
   * @returns {this}
   */
  setDefaultCtx({ t, term, a, action, o, orient } = {}) {
    this.defaultCtx = { t, term, a, action, o, orient };
    return this;
  }

  /**
   * Register `ComponentHandler` to render for every permutation of the
   * trigram (merged over `defaultCtx`). No-op when the merged trigram is
   * empty; a nullish `ComponentHandler` makes the Reactor render nothing
   * for those trigrams.
   * @param {TrigramProps} [trigramProps] - trigram(s) to match
   * @param {import('react').ComponentType<*>} [ComponentHandler] - component
   *        to render on match
   * @param {Object<string, *>} [props] - extra props for the rendered
   *        component (AppCon data overrides same-named keys)
   * @returns {this}
   * @throws {Error} when `ComponentHandler` is neither a React.Component
   *         nor a function
   */
  addComponentHandler(
    { t, term, a, action, o, orient } = {},
    ComponentHandler,
    props,
  ) {
    if (
      ComponentHandler &&
      !(
        ComponentHandler instanceof React.Component ||
        ComponentHandler instanceof Function
      )
    ) {
      throw new Error(
        'cannot add a Component handler that is not a React.Component or Function',
      );
    }
    const tao = normalizeClean({ t, term, a, action, o, orient });
    const ctx = Object.assign(this.defaultCtx, tao);
    const permutations = cartesian(ctx);
    if (!permutations.length) {
      return this;
    }
    const handler = wrappedHandler(ComponentHandler, props, this);
    if (!this._components.has(ComponentHandler)) {
      this._components.set(ComponentHandler, {
        handlers: new Map(),
        index: new Map(),
      });
    }
    const componentHandlers = this._components.get(ComponentHandler);
    permutations.forEach((tao) => {
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

  /**
   * Unregister a component: with trigram parts, removes those permutations;
   * with an empty trigram (and empty `defaultCtx`), removes every handler
   * registered for `ComponentHandler`.
   * @param {TrigramProps} [trigramProps] - trigram(s) to remove
   * @param {import('react').ComponentType<*>} [ComponentHandler] - the
   *        registered component
   * @returns {this}
   */
  removeComponentHandler(
    { t, term, a, action, o, orient } = {},
    ComponentHandler,
  ) {
    if (!this._components.has(ComponentHandler)) {
      return this;
    }
    const componentHandlers = this._components.get(ComponentHandler);
    const tao = normalizeClean({ t, term, a, action, o, orient });
    if (!tao.term && !tao.action && !tao.orient) {
      // remove all handlers
      for (let [ac, handler] of componentHandlers.handlers) {
        this._tao.removeInlineHandler(ac.unwrapCtx(), handler);
      }
      this._components.delete(ComponentHandler);
      return this;
    }
    const ctx = Object.assign(this.defaultCtx, tao);
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

  /**
   * Subscribe a Reactor (or any identity) to be notified on new matches.
   * @param {object} reactor - the subscriber identity
   * @param {() => void} [notify] - called when a matching AppCon updates
   *        `current`
   * @returns {void}
   */
  registerReactor(reactor, notify = noop) {
    this._reactors.set(reactor, notify);
  }

  /**
   * Remove a previously registered Reactor subscription.
   * @param {object} reactor - the subscriber identity
   * @returns {void}
   */
  unregisterReactor(reactor) {
    this._reactors.delete(reactor);
  }
}

export default Adapter;
