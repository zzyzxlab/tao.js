import React, { Component } from 'react';
import cartesian from 'cartesian';
import { AppCtx } from '@tao.js/core';

import { normalizeAC, cleanInput } from './helpers';
import { Context } from './Provider';

export default function createContextHandler(tao, handler, defaultValue) {
  if (handler != null && typeof handler !== 'function') {
    throw new Error('createContextHandler `handler` must be a function');
  }
  const WrappingContext = React.createContext(defaultValue);
  class Provider extends Component {
    static contextType = Context;

    constructor(props) {
      super(props);
      this.state =
        typeof defaultValue === 'function'
          ? defaultValue()
          : defaultValue || {};
    }

    componentWillMount() {
      const { TAO } = this.context;
      const trigrams = cleanInput(normalizeAC(tao));
      const permutations = cartesian(trigrams);
      permutations.forEach(trigram =>
        TAO.addInlineHandler(trigram, this.contextHandler)
      );
    }

    componentWillUnmount() {
      const { TAO } = this.context;
      const trigrams = cleanInput(normalizeAC(tao));
      const permutations = cartesian(trigrams);
      permutations.forEach(trigram =>
        TAO.removeInlineHandler(trigram, this.contextHandler)
      );
    }

    contextHandler = (tao, data) => {
      const dataUpdate = handler
        ? handler(tao, data, data => this.setState(data))
        : data;
      if (dataUpdate instanceof AppCtx) {
        return dataUpdate;
      }
      if (dataUpdate != null) {
        const newState = Object.assign({}, this.state, dataUpdate);
        this.setState(newState);
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
