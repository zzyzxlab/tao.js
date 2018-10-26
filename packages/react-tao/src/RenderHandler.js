import React, { Component } from 'react';
import { Context } from './Provider';

export default class RenderHandler extends Component {
  constructor(props) {
    super(props);
    this.state = { shouldRender: false };
  }

  componentDidMount() {
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
    this.setState({ shouldRender: true });
  };

  render() {
    const { context, children } = this.props;
    const { shouldRender } = this.state;

    return (
      <Context.Consumer>
        {({ TAO, data }) => {
          if (!shouldRender) {
            return null;
          }
          const ctx = data.get(context);
          return (
            <ctx.Consumer>
              {ctxData =>
                React.Children.map(children, child =>
                  React.createElement(child, { ...ctxData })
                )
              }
            </ctx.Consumer>
          );
        }}
      </Context.Consumer>
    );
  }
}
