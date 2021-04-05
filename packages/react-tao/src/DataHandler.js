import React, { Component } from 'react';

import { Context } from './Provider';
import createContextHandler from './createContextHandler';

export default class DataHandler extends Component {
  static contextType = Context;

  constructor(props) {
    super(props);
    this.ChildContext = createContextHandler(
      props,
      props.handler,
      props.default
    );
  }

  componentDidMount() {
    const { name } = this.props;
    const { setDataContext } = this.context;
    setDataContext(name, this.ChildContext);
  }

  componentWillUnmount() {
    const { name } = this.props;
    const { removeDataContext } = this.context;
    removeDataContext(name);
  }

  render() {
    const { children } = this.props;
    const Provider = this.ChildContext.Provider;
    // use React.Children here to inject the context somehow?
    // https://reactjs.org/docs/react-api.html#reactchildren
    return <Provider>{children}</Provider>;
  }
}
