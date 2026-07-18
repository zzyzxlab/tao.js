import React from 'react';

import { Context } from './Provider';
import { useDataLayers } from './DataLayerContext';
import { getPermutations } from './helpers';

export function useTaoContext() {
  const { TAO } = React.useContext(Context);
  return TAO;
}

function useTaoEffect(
  handlerType,
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  const [addingHandler, removingHandler] = [
    `add${handlerType}Handler`,
    `remove${handlerType}Handler`,
  ];
  const TAO = useTaoContext();
  const permutations = getPermutations({ t, term, a, action, o, orient });
  React.useEffect(() => {
    permutations.forEach((trigram) => TAO[addingHandler](trigram, handler));
    return () => {
      permutations.forEach((trigram) => TAO[removingHandler](trigram, handler));
    };
  }, dependencies);
}

export function useTaoInlineHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  useTaoEffect(
    'Inline',
    { t, term, a, action, o, orient },
    handler,
    dependencies,
  );
}

export function useTaoAsyncHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  useTaoEffect(
    'Async',
    { t, term, a, action, o, orient },
    handler,
    dependencies,
  );
}

export function useTaoInterceptHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies,
) {
  useTaoEffect(
    'Intercept',
    { t, term, a, action, o, orient },
    handler,
    dependencies,
  );
}

/**
 * Tree-scoped named data from ancestor DataHandlers.
 * @param {string} [name] — when omitted, returns the nearest DataHandler value
 */
export function useTaoData(name) {
  const layers = useDataLayers();
  if (!layers || !layers.length) {
    return;
  }
  if (name == null || name === '') {
    return layers[layers.length - 1].value;
  }
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    if (layers[i].name === name) {
      return layers[i].value;
    }
  }
}

/**
 * @deprecated Since 0.17 — alias of `useTaoData`; prefer `useTaoData(name)`.
 * Still reads the tree-scoped layer (same as useTaoData) for a named slot.
 */
export function useTaoDataContext(name) {
  return useTaoData(name);
}
