import { useContext, useEffect, useLayoutEffect } from 'react';
import cartesian from 'cartesian';

import { Context } from './Provider';
import { normalizeClean } from './helpers';

function getPermutations({ t, term, a, action, o, orient }) {
  const trigram = normalizeClean({ t, term, a, action, o, orient });
  return cartesian(trigram);
}

function handlerForPermutations(taoHandle, permutations, handler) {
  if (permutations.length) {
    permutations.forEach(({ term, action, orient }) =>
      taoHandle({ term, action, orient }, handler)
    );
  }
}

function useTaoEffect(
  handlerType,
  { t, term, a, action, o, orient },
  handler,
  dependencies
) {
  const [addingHandler, removingHandler] = [
    `add${handlerType}Handler`,
    `remove${handlerType}Handler`
  ];
  const { TAO } = useContext(Context);
  const permutations = getPermutations({ t, term, a, action, o, orient });
  useEffect(() => {
    handlerForPermutations(TAO[addingHandler], permutations, handler);
    return () => {
      handlerForPermutations(TAO[removingHandler], permutations, handler);
    };
  }, dependencies);
}

export function useTaoContext() {
  const { TAO } = useContext(Context);
  return TAO;
}

export function useTaoInlineHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies
) {
  useTaoEffect(
    'Inline',
    { t, term, a, action, o, orient },
    handler,
    dependencies
  );
}

export function useTaoAsyncHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies
) {
  useTaoEffect(
    'Async',
    { t, term, a, action, o, orient },
    handler,
    dependencies
  );
}

export function useTaoInterceptHandler(
  { t, term, a, action, o, orient },
  handler,
  dependencies
) {
  useTaoEffect(
    'Intercept',
    { t, term, a, action, o, orient },
    handler,
    dependencies
  );
}

export function useTaoDataContext(name) {
  const { getDataContext } = useContext(Context);
  const dataContext = getDataContext(name);
  return useContext(dataContext);
}
