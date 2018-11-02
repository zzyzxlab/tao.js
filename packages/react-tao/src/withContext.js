import React from 'react';

import createContextHandler from './createContextHandler';

export default function withContext(tao, handler, defaultValue) {
  if (typeof handler !== 'function') {
    throw new Error('withContext `handler` must be a function');
  }
  const WrappingContext = createContextHandler(tao, handler, defaultValue);
  return ComponentToWrap => {
    const wrappedComponent = props => (
      <WrappingContext.Provider>
        <WrappingContext.Consumer>
          {/* value =>
            React.cloneElement(ComponentToWrap, { data: value, ...props })
          */}
          {value => <ComponentToWrap data={value} {...props} />}
        </WrappingContext.Consumer>
      </WrappingContext.Provider>
    );
    wrappedComponent.displayName = `withContext(${ComponentToWrap.displayName ||
      ComponentToWrap.name}`;
    return wrappedComponent;
  };
}
