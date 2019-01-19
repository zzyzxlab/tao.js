import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Context } from './Provider';

function recursiveContextGenerator(
  ctxList,
  getContext,
  children,
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
        return children(...ctxDataArgs);
      }}
    </context.Consumer>
  );
}

export default class DataConsumer extends Component {
  static contextType = Context;

  static propTypes = {
    context: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string)
    ]).isRequired,
    children: PropTypes.func.isRequired
  };

  render() {
    const { context, children } = this.props;
    const { getDataContext } = this.context;
    const ctxList = Array.isArray(context) ? context : [context];
    return recursiveContextGenerator(ctxList, getDataContext, children);
  }
}
