import { useEffect, useRef } from 'react';

import { useTaoContext } from './hooks';
import { serializeTrigrams } from './helpers';

/**
 * Reconcile Kernel inline handlers to the declared `trigrams` list.
 * Uses a stable wrapper so callback identity churn does not resubscribe.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TAO, depKey]);
}
