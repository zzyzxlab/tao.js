import React from 'react';
import PropTypes from 'prop-types';
import TAO, { Kernel } from '@tao.js/core';

/**
 * Root TAO + accumulated named data contexts.
 * Each DataHandler nests a new Provider value with `data[name]` merged in,
 * so descendants see data during the same render (no Map + didMount race).
 */
const Context = React.createContext({
  TAO,
  data: {},
});

export { Context };

export default class Provider extends React.Component {
  static propTypes = {
    TAO: PropTypes.instanceOf(Kernel).isRequired,
  };

  render() {
    const { TAO, children } = this.props;
    return (
      <Context.Provider value={{ TAO, data: {} }}>{children}</Context.Provider>
    );
  }
}
