import React, { Component, createContext } from 'react';
import PropTypes from 'prop-types';
import TAO, { Kernel } from '@tao.js/core';

const defaultGlobalDataContexts = new Map();

const makeDataContextFunctions = dataCtxMap => {
  return {
    setDataContext(key, ctx) {
      dataCtxMap.set(key, ctx);
    },
    getDataContext(key) {
      return dataCtxMap.get(key);
    },
    removeDataContext(key) {
      dataCtxMap.delete(key);
    }
  };
};

const Context = createContext({
  TAO,
  ...makeDataContextFunctions(defaultGlobalDataContexts)
});

export { Context };

export default class Provider extends Component {
  static propTypes = {
    TAO: PropTypes.instanceOf(Kernel).isRequired
  };

  constructor(props) {
    super(props);
    this._dataContexts = new Map();
    this.state = makeDataContextFunctions(this._dataContexts);
  }

  render() {
    const { TAO, children } = this.props;
    const dataContextFunctions = this.state;
    return (
      <Context.Provider value={{ TAO, ...dataContextFunctions }}>
        {children}
      </Context.Provider>
    );
  }
}
