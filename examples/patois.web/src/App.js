import React, { Component } from 'react';
import TAO from '@tao.js/core';
import { Provider } from '@tao.js/react';
import logo from './logo.svg';
import './App.css';
import Space, { SpaceAltContainer } from './components/Space';

class App extends Component {
  render() {
    return (
      <Provider TAO={TAO}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to React</h1>
          </header>
          <SpaceAltContainer />
        </div>
      </Provider>
    );
  }
}

export default App;
