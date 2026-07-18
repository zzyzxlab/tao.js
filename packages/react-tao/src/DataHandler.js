import React from 'react';

import { Context } from './Provider';
import createContextHandler from './createContextHandler';

/**
 * Subscribes to TAO trigrams and merges handler state into the named data bag
 * on the shared Context tree (see README “FIX DATA CONTEXT FOR REACT”).
 */
export default class DataHandler extends React.Component {
  static contextType = Context;

  constructor(props) {
    super(props);
    this.ChildContext = createContextHandler(
      props,
      props.handler,
      props.default,
    );
  }

  render() {
    const { name, children } = this.props;
    const { TAO, data: parentData = {} } = this.context;
    const { Provider: LocalProvider, Consumer: LocalConsumer } =
      this.ChildContext;

    return (
      <LocalProvider>
        <LocalConsumer>
          {(localData) => (
            <Context.Provider
              value={{
                TAO,
                data: {
                  ...parentData,
                  [name]: localData,
                },
              }}
            >
              {children}
            </Context.Provider>
          )}
        </LocalConsumer>
      </LocalProvider>
    );
  }
}
