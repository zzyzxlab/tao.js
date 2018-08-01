import { Component, createElement } from 'react';
import PropTypes from 'prop-types';
import Adapter from './Adapter';

const DUMMY_STATE = {};

class Reactor extends Component {
  static get propTypes() {
    return {
      adapter: PropTypes.instanceOf(Adapter).isRequired
    };
  }

  constructor(props) {
    super(props);
    // this._adapter = adapter;
  }

  componentWillMount() {
    const { adapter } = this.props;
    adapter.registerReactor(this, this.onNotifyChange.bind(this));
  }

  componentWillUnmount() {
    const { adapter } = this.props;
    adapter.unregisterReactor(this);
  }

  componentWillReceiveProps(nextProps) {
    const { adapter } = this.props;
    if (adapter !== nextProps.adapter) {
      adapter.unregisterReactor(this);
      nextProps.adapter.registerReactor(this, this.onNotifyChange.bind(this));
    }
  }

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
    return createElement(ComponentHandler, {
      ...tao,
      ...props,
      ...childProps
    });
  }
}

export default Reactor;
