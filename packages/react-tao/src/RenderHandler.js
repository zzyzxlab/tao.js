import React from 'react';
import PropTypes from 'prop-types';
import cartesian from 'cartesian';

import { normalizeClean, getPermutations } from './helpers';
import { Context } from './Provider';

function readNamedData(dataBag, ctxName) {
  // Stryker disable all: dataBag==null short-circuit redundant with Provider {}; console is diagnostic
  if (
    dataBag == null ||
    !Object.prototype.hasOwnProperty.call(dataBag, ctxName)
  ) {
    console.warn(
      `RenderHandler::Unable to find context for '${ctxName}'. Please check that you have it spelled correctly.`,
    );
    console.info(`RenderHandler::setting context ${ctxName} data arg to null`);
    return null;
  }
  // Stryker restore all
  return dataBag[ctxName];
}

export default class RenderHandler extends React.Component {
  static contextType = Context;

  static propTypes = {
    term: PropTypes.any,
    action: PropTypes.any,
    orient: PropTypes.any,
    context: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
    debug: PropTypes.bool,
    children: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    let { shouldRender } = props;
    // Stryker disable next-line all: undefined shouldRender is already falsy in render()
    shouldRender = typeof shouldRender === 'undefined' ? false : shouldRender;
    this.state = { shouldRender };
    this._refreshOn = null;
  }

  componentDidMount() {
    // Stryker disable next-line BooleanLiteral: debug defaults false; logging is optional
    const { debug = false } = this.props;
    // Stryker disable all: optional debug logging
    debug && console.log('RenderHandler::props:', this.props);
    debug && console.log('RenderHandler::context:', this.context);
    // Stryker restore all
    const { TAO } = this.context;
    const permutations = getPermutations(this.props);
    // Stryker disable next-line ConditionalExpression: empty permutations make forEach a no-op
    if (permutations.length) {
      permutations.forEach(({ term, action, orient }) =>
        TAO.addInlineHandler({ term, action, orient }, this.handleRender),
      );
    }
    const { refreshOn } = this.props;
    if (refreshOn) {
      const trigram = normalizeClean(this.props);
      const refresh = normalizeClean(refreshOn);
      if (!Object.keys(refresh).length) {
        return;
      }
      this._refreshOn = cartesian({ ...trigram, ...refresh });
      this._refreshOn.forEach(({ term, action, orient }) =>
        TAO.addInlineHandler({ term, action, orient }, this.handleRender),
      );
    }
  }

  componentWillUnmount() {
    const { TAO } = this.context;
    const permutations = getPermutations(this.props);
    // Stryker disable next-line ConditionalExpression: empty permutations make forEach a no-op
    if (permutations.length) {
      permutations.forEach(({ term, action, orient }) =>
        TAO.removeInlineHandler({ term, action, orient }, this.handleRender),
      );
    }
    if (this._refreshOn && this._refreshOn.length) {
      this._refreshOn.forEach(({ term, action, orient }) =>
        TAO.removeInlineHandler({ term, action, orient }, this.handleRender),
      );
    }
  }

  handleRender = (tao, data) => {
    // TODO: allow shouldRender prop be a function called
    this.setState({ tao, data, shouldRender: true });
  };

  render() {
    const { context, children } = this.props;
    const { shouldRender, tao, data } = this.state;
    const { data: dataBag } = this.context;

    if (!shouldRender) {
      return null;
    }
    // Stryker disable next-line all: no-context path is covered; empty-block fallthrough still invokes children
    if (!context) {
      return <React.Fragment>{children(tao, data)}</React.Fragment>;
    }
    const ctxList = Array.isArray(context) ? context : [context];
    const ctxArgs = ctxList.map((ctxName) => readNamedData(dataBag, ctxName));
    return <React.Fragment>{children(tao, data, ...ctxArgs)}</React.Fragment>;
  }
}
