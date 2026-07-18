import { useCallback, useRef, useState } from 'react';
import { AppCtx } from '@tao.js/core';

import { getPermutations } from './helpers';
import useTaoInlineSubscription from './useTaoInlineSubscription';

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
 */
export default function useTaoDataState(trigramProps, handler, defaultValue) {
  const [state, setState] = useState(() =>
    typeof defaultValue === 'function'
      ? defaultValue()
      : defaultValue != null
        ? defaultValue
        : {},
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const onSignal = useCallback((tao, data) => {
    let usedSet = false;
    const current = stateRef.current;
    const activeHandler = handlerRef.current;
    const dataUpdate = activeHandler
      ? activeHandler(
          tao,
          data,
          (next) => {
            const update = cleanState(current, next);
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

  const trigrams = getPermutations(trigramProps || {});
  useTaoInlineSubscription(trigrams, onSignal);

  return state;
}
