import { useCallback, useRef, useState } from 'react';
import { AppCtx } from '@tao.js/core';

import { getPermutations } from './helpers';
import useTaoInlineSubscription from './useTaoInlineSubscription';

/** @typedef {import('./helpers').TrigramProps} TrigramProps */
/** @typedef {import('./helpers').TaoSignal} TaoSignal */

/**
 * Derives the next handler-managed data from a matching AppCon. Used by
 * `DataHandler`, `createContextHandler`, and `withContext`.
 *
 * Three ways to produce state (in precedence order):
 * 1. call `set(next)` — replaces state with `next`, clearing any previous
 *    keys `next` omits (`set(null)` clears every key to undefined); once
 *    `set` is used, a non-AppCtx return value is ignored;
 * 2. return the next state directly (nullish return = no state change);
 * 3. return an {@link AppCtx} — it is chained on the network instead of
 *    becoming state (works alongside a prior `set` call).
 *
 * @template [S=any]
 * @callback TaoDataHandler
 * @param {TaoSignal} tao - the dispatched AppCon's concrete trigram
 * @param {*} data - the AppCon's data (always an object, may be empty)
 * @param {(next: ?S) => void} set - imperative state setter (see above)
 * @param {S} current - the state at dispatch time
 * @returns {S|AppCtx|void} next state, an AppCtx to chain, or nothing
 */

/**
 * Build the next state from `newState`, clearing (to `undefined`) every key
 * of `previousState` that `newState` omits; `null`/`undefined` clears all
 * previous keys.
 * @param {Object<string, *>} previousState
 * @param {?Object<string, *>} [newState]
 * @returns {Object<string, *>}
 */
export function cleanState(previousState, newState) {
  const keys = Object.keys(previousState);
  if (newState == null) {
    return keys.reduce((rv, key) => {
      rv[key] = void 0;
      return rv;
    }, {});
  }
  keys.push(...Object.keys(newState));
  return keys.reduce((rv, key) => {
    rv[key] = newState[key];
    return rv;
  }, {});
}

/**
 * Local state driven by Kernel inline handlers for a trigram (+ optional handler).
 * Without a `handler`, each matching AppCon's data replaces the state.
 * @template [S=any]
 * @param {?TrigramProps} trigramProps - trigram(s) to subscribe to (array
 *        parts multi-match; null/empty = one all-wildcard subscription)
 * @param {?TaoDataHandler<S>} [handler] - derives the next state per signal;
 *        omitted = the AppCon data becomes the state
 * @param {S|(() => S)} [defaultValue] - initial state or lazy initializer
 *        (defaults to `{}`)
 * @returns {S} the current handler-managed state
 */
export default function useTaoDataState(trigramProps, handler, defaultValue) {
  const [state, setState] = useState(
    /** @type {() => S} */ (
      () =>
        typeof defaultValue === 'function'
          ? /** @type {() => S} */ (defaultValue)()
          : defaultValue != null
            ? defaultValue
            : {}
    ),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  // Stryker disable all: stable onSignal; handlerRef keeps latest handler; deps ArrayDeclaration equiv
  const onSignal = useCallback((tao, data) => {
    let usedSet = false;
    const current = stateRef.current;
    const activeHandler = handlerRef.current;
    const dataUpdate = activeHandler
      ? activeHandler(
          tao,
          data,
          (next) => {
            const update = /** @type {S} */ (cleanState(current, next));
            setState(update);
            usedSet = true;
          },
          current,
        )
      : data;
    if (dataUpdate instanceof AppCtx) {
      return dataUpdate;
    }
    // Stryker disable next-line ConditionalExpression: usedSet precedence covered in tests
    if (!usedSet && dataUpdate != null) {
      setState(dataUpdate);
    }
  }, []);
  // Stryker restore all

  const trigrams = getPermutations(trigramProps || {});
  useTaoInlineSubscription(trigrams, onSignal);

  return state;
}
