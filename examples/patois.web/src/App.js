import React, { Component } from 'react';
import TAO from '@tao.js/core';
import logo from './logo.svg';
import './App.css';
import Space from './components/Space';

const TAOContext = React.createContext({ TAO });

class App extends Component {
  render() {
    return (
      <TAOContext.Provider TAO={TAO}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to React</h1>
          </header>
          <Space />
        </div>
      </TAOContext.Provider>
    );
  }
}

export default App;
