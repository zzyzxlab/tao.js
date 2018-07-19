import React, { Component } from 'react';
import TAO from '@tao.js/core';
import { Provider, Reactor } from '@tao.js/react';
import logo from './logo.svg';
import './App.css';
// import SpaceList from './components/SpaceList';
import Space from './components/Space';

// const appProvider = new Provider(TAO);
// appProvider.addComponentHandler(
//   { term: 'Space', action: 'List', orient: 'Portal' },
//   SpaceList
// );

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <Space />
      </div>
    );
  }
}

export default App;
