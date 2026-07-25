import React from 'react';
import PropTypes from 'prop-types';
import Adapter from './Adapter';

const DUMMY_STATE = {};

/**
 * Props for {@link Reactor}: the adapter plus passthrough props spread onto
 * whichever component the adapter's current match renders.
 * @typedef {{ adapter: Adapter } & Object<string, *>} ReactorProps
 */

/**
 * Original ("orig" entry) API: renders the component its {@link Adapter}
 * registered for the most recent matching AppCon — or nothing before any
 * match. The rendered component receives the trigram (`t`/`a`/`o`), the
 * Reactor's passthrough props, and the registration props merged with the
 * AppCon data. NOTE: children are ignored.
 * Legacy — prefer `RenderHandler` / `SwitchHandler` from the package root.
 * @extends {React.Component<ReactorProps>}
 */
class Reactor extends React.Component {
  static get propTypes() {
    return {
      adapter: PropTypes.instanceOf(Adapter).isRequired,
    };
  }

  /**
   * @param {ReactorProps} props
   */
  constructor(props) {
    super(props);
    // this._adapter = adapter;
  }

  componentDidMount() {
    const { adapter } = this.props;
    adapter.registerReactor(this, this.onNotifyChange.bind(this));
  }

  componentWillUnmount() {
    const { adapter } = this.props;
    // Stryker disable next-line all: defensive optional calls; propTypes require adapter
    adapter && adapter.unregisterReactor && adapter.unregisterReactor(this);
  }

  /**
   * @param {ReactorProps} prevProps
   */
  componentDidUpdate(prevProps) {
    const { adapter } = this.props;
    if (adapter !== prevProps.adapter) {
      prevProps.adapter.unregisterReactor(this);
      adapter.registerReactor(this, this.onNotifyChange.bind(this));
    }
  }

  /**
   * @param {ReactorProps} nextProps
   * @returns {boolean}
   */
  shouldComponentUpdate(nextProps) {
    return true;
  }
  //   // TODO: Implement this properly
  //   // CURRENTLY: this.props.adapter already has the changes after a TAO Handler
  //   const { adapter, children, ...props } = this.props;
  //   if (adapter !== nextProps.adapter) {
  //     return true;
  //   }
  //   if (
  //     (adapter.current == null && nextProps.adapter.current != null) ||
  //     (adapter.current != null && nextProps.adapter.current == null)
  //   ) {
  //     return true;
  //   }
  //   if (adapter.current == null && nextProps.adapter.current == null) {
  //     return false;
  //   }
  //   // TODO: if the term, action, orient or any other props change for the same
  //   //  Component, if this returns `false` will React still call render on the
  //   //  Component
  //   if (adapter.current.Component !== nextProps.adapter.current.Component) {
  //     return true;
  //   }
  //   // TODO: figure out if need to perform props equality check
  //   //  - by checking if updated props get sent to re-rendered child
  //   return false;
  // }

  onNotifyChange() {
    this.setState(DUMMY_STATE);
  }

  render() {
    // NOTE: Currently swallows any children
    const { adapter, children, ...props } = this.props;
    if (!adapter.current) {
      return null;
    }
    const { ComponentHandler, tao, props: childProps } = adapter.current;
    if (!ComponentHandler) {
      return null;
    }
    return React.createElement(ComponentHandler, {
      ...tao,
      ...props,
      ...childProps,
    });
  }
}

export default Reactor;
