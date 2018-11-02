import React from 'react';

import createContextHandler from './createContextHandler';

export default function withContext(tao, handler, defaultValue) {
  if (typeof handler !== 'function') {
    throw new Error('withContext `handler` must be a function');
  }
  const WrappingContext = createContextHandler(tao, handler, defaultValue);
  return ComponentToWrap => props => (
    <WrappingContext.Provider>
      <WrappingContext.Consumer>
        {value => <ComponentToWrap data={value} {...props} />}
      </WrappingContext.Consumer>
    </WrappingContext.Provider>
  );
}
