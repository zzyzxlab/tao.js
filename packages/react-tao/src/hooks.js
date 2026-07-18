import React from 'react';

import { Context } from './Provider';
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

export function useTaoDataContext(name) {
  const { data } = React.useContext(Context);
  if (data == null || !Object.prototype.hasOwnProperty.call(data, name)) {
    return undefined;
  }
  return data[name];
}
