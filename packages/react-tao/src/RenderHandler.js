import React, { Component } from 'react';
import { Context } from './Provider';

function recursiveContextGenerator(
  ctxList,
  getContext,
  children,
  tao,
  data,
  ctxIdx = 0,
  ctxDataArgs = []
) {
  const ctxName = ctxList[ctxIdx];
  const context = getContext(ctxName);
  if (ctxList.length > ctxIdx + 1) {
    return (
      <context.Consumer name={`${ctxName}.Consumer`}>
        {ctxData => {
          ctxDataArgs.push(ctxData);
          return recursiveContextGenerator(
            ctxList,
            getContext,
            children,
            tao,
            data,
            ctxIdx + 1,
            ctxDataArgs
          );
        }}
      </context.Consumer>
    );
  }
  return (
    <context.Consumer name={`${ctxName}.Consumer`}>
      {ctxData => {
        ctxDataArgs.push(ctxData);
        return children(toa, data, ...ctxDataArgs);
      }}
    </context.Consumer>
  );
}

export default class RenderHandler extends Component {
  static contextType = Context;

  constructor(props) {
    super(props);
    let { shouldRender } = props;
    shouldRender = typeof shouldRender === 'undefined' ? false : shouldRender;
    this.state = { shouldRender };
  }

  componentWillMount() {
    const { term, action, orient } = this.props;
    const { TAO } = this.context;
    TAO.addInlineHandler({ term, action, orient }, this.handleRender);
  }

  componentWillUnmount() {
    const { term, action, orient } = this.props;
    const { TAO } = this.context;
    TAO.removeInlineHandler({ term, action, orient }, this.handleRender);
  }

  handleRender = (tao, data) => {
    this.setState({ tao, data, shouldRender: true });
  };

  render() {
    const { context, children } = this.props;
    const { shouldRender, tao, data } = this.state;
    const { getDataContext } = this.context;

    if (!shouldRender) {
      return null;
    }
    const ctxList = Array.isArray(context) ? context : [context];
    return recursiveContextGenerator(
      ctxList,
      getDataContext,
      children,
      tao,
      data
    );
  }
}
