import React, { Component, createContext } from 'react';
import { AppCtx } from '@tao.js/core';
import { Context } from './Provider';

export default class DataHandler extends Component {
  static contextType = Context;

  constructor(props) {
    super(props);
    this.state = props.default || {};
    this.ChildContext = createContext(this.state);
  }

  componentWillMount() {
    const { term, action, orient, name } = this.props;
    const { TAO, setDataContext } = this.context;
    setDataContext(name, this.ChildContext);
    TAO.addInlineHandler({ term, action, orient }, this.handleData);
  }

  componentWillUnmount() {
    const { term, action, orient, name } = this.props;
    const { TAO, removeDataContext } = this.context;
    removeDataContext(name);
    TAO.removeInlineHandler({ term, action, orient }, this.handleData);
  }

  handleData = (tao, data) => {
    const { handler } = this.props;
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
    const { children } = this.props;
    const Provider = this.ChildContext.Provider;
    // use React.Children here to inject the context somehow?
    // https://reactjs.org/docs/react-api.html#reactchildren
    return <Provider value={this.state}>{children}</Provider>;
  }
}
