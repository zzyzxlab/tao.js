import React from 'react';
import { AppCtx } from '@tao.js/core';

import { getPermutations } from './helpers';
import { Context } from './Provider';

function cleanState(previousState, newState) {
  const keys = Object.keys(previousState);
  if (newState == null) {
    return keys.reduce((rv, key) => {
      rv[key] = void 0;
      return rv;
    }, {});
  }
  keys.push(...Object.keys(newState));
  return keys.reduce((rv, key) => {
    rv[key] = newState[key];
    return rv;
  }, {});
}

export default function createContextHandler(tao, handler, defaultValue) {
  if (handler != null && typeof handler !== 'function') {
    throw new Error('createContextHandler `handler` must be a function');
  }
  const WrappingContext = React.createContext(defaultValue);
  class Provider extends React.Component {
    static contextType = Context;

    constructor(props) {
      super(props);
      this.state =
        typeof defaultValue === 'function'
          ? defaultValue()
          : defaultValue || {};
    }

    componentDidMount() {
      const { TAO } = this.context;
      const permutations = getPermutations(tao);
      permutations.forEach(trigram =>
        TAO.addInlineHandler(trigram, this.contextHandler)
      );
    }

    componentWillUnmount() {
      const { TAO } = this.context;
      const permutations = getPermutations(tao);
      permutations.forEach(trigram =>
        TAO.removeInlineHandler(trigram, this.contextHandler)
      );
    }

    contextHandler = (tao, data) => {
      let usedSet = false;
      const current = this.state;
      const dataUpdate = handler
        ? handler(
            tao,
            data,
            data => {
              const update = cleanState(current, data);
              this.setState(update);
              usedSet = true;
            },
            current
          )
        : data;
      if (dataUpdate instanceof AppCtx) {
        return dataUpdate;
      }
      if (!usedSet && dataUpdate != null) {
        this.setState(dataUpdate);
      }
    };

    render() {
      return (
        <WrappingContext.Provider value={this.state}>
          {this.props.children}
        </WrappingContext.Provider>
      );
    }
  }
  return {
    Provider,
    Consumer: WrappingContext.Consumer
  };
}
