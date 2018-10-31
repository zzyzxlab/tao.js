import React, { Component } from 'react';
import TAO from '@tao.js/core';
import { Provider, RenderHandler } from '@tao.js/react';
import logo from './logo.svg';
import './App.css';
import ErrorMessage from './components/shared/ErrorMessage';
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
          <RenderHandler action="Fail">
            {(tao, data) => (
              <ErrorMessage
                Fail={data.Fail}
                messageToDisplay={(on, message) =>
                  `Failed '${on}' ${tao.t} with '${message}'`
                }
              />
            )}
          </RenderHandler>
          <SpaceAltContainer />
        </div>
      </Provider>
    );
  }
}

export default App;
