import React, { Component, createContext } from 'react';
import { Context } from './Provider';

export default class DataHandler extends Component {
  static contextTypes = Context;

  constructor(props) {
    super(props);
    this.state = props.default || {};
    this.ChildContext = createContext(this.state);
  }

  componentDidMount() {
    const { term, action, orient, key } = this.props;
    const { TAO, data } = this.context;
    data.set(key, this.ChildContext);
    TAO.addInlineHandler({ term, action, orient }, this.handleData);
  }

  componentWillUnmount() {
    const { term, action, orient, key } = this.props;
    const TAO = this.context;
    data.delete(key);
    TAO.removeInlineHandler({ term, action, orient }, this.handleData);
  }

  handleData = (tao, data) => {
    const { handler } = this.props;
    const dataUpdate = handler ? handler(tao, data) : data;
    const newState = Object.assign({}, this.state, dataUpdate);
    this.setState(newState);
  };

  render() {
    const { children } = this.props;
    const Provider = this.ChildContext.Provider;
    // use React.Children here to inject the context somehow
    // https://reactjs.org/docs/react-api.html#reactchildren
    return <Provider value={this.state}>{children}</Provider>;
  }
}
