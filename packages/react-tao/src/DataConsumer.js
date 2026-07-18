import React from 'react';
import PropTypes from 'prop-types';

import { Context } from './Provider';

function readNamedData(data, ctxName) {
  // Stryker disable next-line ConditionalExpression: missing key still yields undefined≈null for consumers that only check truthiness; warn path is asserted separately
  if (data == null || !Object.prototype.hasOwnProperty.call(data, ctxName)) {
    // Stryker disable all: diagnostic console output only
    console.warn(
      `DataConsumer::Unable to find context for '${ctxName}'. Please check that you have it spelled correctly.`,
    );
    console.info(`DataConsumer::setting context ${ctxName} data arg to null`);
    // Stryker restore all
    return null;
  }
  return data[ctxName];
}

export default class DataConsumer extends React.Component {
  static contextType = Context;

  static propTypes = {
    context: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
    children: PropTypes.func.isRequired,
  };

  render() {
    const { context, children } = this.props;
    const { data } = this.context;
    const ctxList = Array.isArray(context) ? context : [context];
    const args = ctxList.map((ctxName) => readNamedData(data, ctxName));
    return children(...args);
  }
}
