import React, { Component } from 'react';
import { Context } from './Provider';
import Adapter from './Adapter';
import Reactor from './Reactor';
import RenderHandler from './RenderHandler';

const ChosenHandler = RenderComponent => ({
  t,
  a,
  o,
  children,
  ...restProps
}) => {
  // remove the props that the Reactor injects for the Adapter's component handlers
  // since RenderHandlers already manage explicitly the handler data they receive
  const remove = [t, a, o];
  const props = Object.fromEntries(
    Object.entries(restProps).filter(([key]) => !remove.includes(key))
  );
  return <RenderComponent {...props}>{children}</RenderComponent>;
};

export default class SwitchHandler extends Component {
  static contextType = Context;

  constructor(props) {
    super(props);
    this._adapter = null;
    this._adaptedChildren = new Map();
  }

  componentWillMount() {
    const { TAO } = this.context;
    this._adapter = new Adapter(TAO);
    const { term, action, orient, children } = this.props;
    this._adapter.defaultCtx = { term, action, orient };
    React.Children.forEach(children, child => {
      if (child instanceof RenderHandler) {
        const { term, action, orient } = child.props;
        this._adaptedChildren.set(child, ChosenHandler(child));
        this._adapter.addComponentHandler(
          { term, action, orient },
          this._adaptedChildren.get(child)
        );
      }
    });
  }

  componentWillUnmount() {
    this._adaptedChildren.forEach((handler, child) => {
      const { term, action, orient } = child.props;
      this._adapter.removeComponentHandler({ term, action, orient }, handler);
    });
  }

  // handleSwitch = (tao, data) => {
  //   //
  // };

  render() {
    return <Reactor adapter={this._adapter} />;
  }
}
