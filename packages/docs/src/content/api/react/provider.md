# Provider API

**Package:** `@tao.js/react`

**Named Export:** `Provider`

A React `Component` used to provide context to descendant `Component`s from the `@tao.js/react`
package.

## Properties

|name|required|type|description|
|---|---|---|---|
|`TAO`|yes|[`Kernel`](../core/kernel.md)|tao.js Kernel used to attach handlers to|

## Children

Anything can be a child of a `Provider` as it is providing context to children and descendants below.

`Provider` can have zero or more children.

## Example

The general use of `Provider` is to set it at the top of our component tree:

### `src/App.js`

```javascript
import React, { Component } from 'react';
import TAO from '@tao.js/core';
import { Provider } from '@tao.js/react';
import logo from './logo.svg';
import './App.css';
import SpaceContainer from './components/space';

class App extends Component {
  render() {
    return (
      <Provider TAO={TAO}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to Mypos</h1>
          </header>
          <SpaceContainer />
        </div>
      </Provider>
    );
  }
}

export default App;
```
