import { useEffect, useRef } from 'react';

import { useTaoContext } from './hooks';
import { serializeTrigrams } from './helpers';

/** @typedef {import('@tao.js/core').Trigram} Trigram */
/** @typedef {import('@tao.js/core').Handler} Handler */

/**
 * Reconcile Kernel inline handlers to the declared `trigrams` list.
 * Uses a stable wrapper so callback identity churn does not resubscribe.
 * @param {Trigram[]} trigrams - concrete trigram permutations to subscribe to
 *        (resubscribes when the serialized list changes)
 * @param {Handler} handler - `(tao, data) => …`; the latest render's handler
 *        is always invoked; may return an AppCtx to chain on the network
 * @returns {void}
 */
export default function useTaoInlineSubscription(trigrams, handler) {
  const TAO = useTaoContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stableRef = useRef(null);
  // Stryker disable next-line ConditionalExpression: init-once; re-assigning same wrapper each render is equivalent
  if (stableRef.current == null) {
    stableRef.current = (tao, data) => handlerRef.current(tao, data);
  }

  const depKey = serializeTrigrams(trigrams);

  useEffect(() => {
    const stable = stableRef.current;
    const list = trigrams || [];
    list.forEach((trigram) => TAO.addInlineHandler(trigram, stable));
    return () => {
      list.forEach((trigram) => TAO.removeInlineHandler(trigram, stable));
    };
    // trigrams captured with depKey from the same render
    // eslint-disable-next-line -- react-hooks/exhaustive-deps (plugin not in flat config; deps list is intentional)
  }, [TAO, depKey]);
}
