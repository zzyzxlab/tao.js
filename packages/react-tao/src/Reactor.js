import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Provider from './Provider';

class Reactor extends Component {
  // static propTypes = {
  //   provider: PropTypes.instanceOf(Provider),
  // }

  constructor(props) {
    super(props);
    // this._provider = provider;
  }

  componentWillMount() {
    const { provider } = this.props;
    // provider.registerReactor(this);
  }

  componentWillUnmount() {
    const { provider } = this.props;
    // provider.unregisterReactor(this);
  }

  componentWillReceiveProps(nextProps) {
    const { provider } = this.props;
    if (provider !== nextProps.provider) {
      // provider.unregisterReactor(this);
      // nextProps.provider.registerReactor(this);
    }
  }

  // shouldComponentUpdate(nextProps) {
  //   // TODO: Implement this properly
  //   // CURRENTLY: this.props.provider already has the changes after a TAO Handler
  //   const { provider, children, ...props } = this.props;
  //   if (provider !== nextProps.provider) {
  //     return true;
  //   }
  //   if (
  //     (provider.current == null && nextProps.provider.current != null) ||
  //     (provider.current != null && nextProps.provider.current == null)
  //   ) {
  //     return true;
  //   }
  //   if (provider.current == null && nextProps.provider.current == null) {
  //     return false;
  //   }
  //   // TODO: if the term, action, orient or any other props change for the same
  //   //  Component, if this returns `false` will React still call render on the
  //   //  Component
  //   if (provider.current.Component !== nextProps.provider.current.Component) {
  //     return true;
  //   }
  //   // TODO: figure out if need to perform props equality check
  //   //  - by checking if updated props get sent to re-rendered child
  //   return false;
  // }

  render() {
    // NOTE: Currently swallows any children
    const { provider, children, ...props } = this.props;
    if (!provider.current) {
      return null;
    }
    const { Component, tao, props: childProps } = provider.current;
    if (!Component) {
      return null;
    }
    return <Component {...tao} {...props} {...childProps} />;
  }
}

Reactor.propTypes = {
  provider: PropTypes.instanceOf(Provider)
};

export default Reactor;
