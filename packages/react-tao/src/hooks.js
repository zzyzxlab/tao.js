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
  dependencies
) {
  const [addingHandler, removingHandler] = [
    `add${handlerType}Handler`,
    `remove${handlerType}Handler`
  ];
  const TAO = useTaoContext();
  const permutations = getPermutations({ t, term, a, action, o, orient });
  React.useEffect(() => {
    permutations.forEach(trigram => TAO[addingHandler](trigram, handler));
    return () => {
      permutations.forEach(trigram => TAO[removingHandler](trigram, handler));
    };
  }, dependencies);
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
  const { getDataContext } = React.useContext(Context);
  const dataContext = getDataContext(name);
  if (!dataContext) {
    return;
  }
  return React.useContext(dataContext);
}
