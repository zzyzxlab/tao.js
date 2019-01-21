# DataConsumer Component

This doc is incomplete and taken from draft material not included in the main docs.

## Using `DataConsumer`s for easy consumption of shared stata

Above we saw how a `RenderHandler` can use the `context` prop to get access to the shared state
a `DataHandler` will add to the data context created by a `Provider`.

If we want to consume this shared state without being dependent upon a `RenderHandler` to be
rendered only when a specific or set of AppCons are encountered in the TAO, we can use the
`DataConsumer` component to get the data and pass it down to its children using the same
[function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
pattern but without the TAO handler part.

For example, let's assume that specific user roles are granted rights to view details, edit or
create new spaces, and we want to provide that list of rights from the database.

First we'll fetch that data and make it available to the whole app:

### `src/App.js` with roles

```javascript
import React, { Component } from 'react';
import TAO from '@tao.js/core';
import { Provider, DataHandler } from '@tao.js/react';
import logo from './logo.svg';
import './App.css';
import SpaceContainer from './components/space';
import Welcome from './components/shared/welcome';

// fetch the Roles when we enter the App
TAO.addAsyncHandler(
  { t: 'App', a: 'Enter', o: 'Portal' },
  () => new AppCtx('Role', 'Find', 'Portal'),
);

class App extends Component {
  render() {
    return (
      <Provider TAO={TAO}>
        <DataHandler
          name="roleAuthorizations"
          term="Role"
          action="List"
          orient="Portal"
          default={[]}
          handler={(tao, data) => data.Role}
        >
          <DataHandler
            name="currentUser"
            term="User"
            action="Enter"
            orient="Portal"
            default={null}
            handler={(tao, data) => data.User}
          >
            <DataConsumer
              context={['roleAuthorizations', 'currentUser']}
            >{(roleAuthorizations, currentUser) => }
            <div className="App">
              <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <h1 className="App-title">Welcome to Mypos</h1>
                <Welcome />
              </header>
              <SpaceContainer />
            </div>
          </DataHandler>
        </DataHandler>
      </Provider>
    );
  }
}

export default App;
```

Next we'll consume that data

### `src/components/space/index.js` with roles

```javascript
import React from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import {
  DataHandler,
  SwitchHandler,
  RenderHandler,
} from '@tao.js/react';
import List from './List';
import View from './View';
import Form from './Form';

// chain entering a Space with showing the View
TAO.addInlineHandler(
  { t: 'Space', a: 'Enter', o: 'Portal' },
  (tao, { Space }) => {
    return new AppCtx('Space', 'View', 'Portal', { Space });
  }
);

// fetch the SpaceTypes when we enter the App
TAO.addAsyncHandler(
  { t: 'App', a: 'Enter', o: 'Portal' },
  () => new AppCtx('SpaceType', 'Find', 'Portal'),
);

const SpaceContainer = props => (
  {/* Surround our tree with our DataHandler */}
  <DataHandler
    name="spaceTypes"
    term="SpaceType"
    action="List"
    orient="Portal"
    default={[]}
    handler={(tao, data) => data.SpaceTypes}
  >
    <SwitchHandler term="Space" orient="Portal">
      <h2 class="title">Spaces</h2>
      <RenderHandler action="List">
        {(tao, data) => <List data={data.Space} />}
      </RenderHandler>
      <RenderHandler action="View">
        {(tao, data) => <View Space={data.Space} />}
      </RenderHandler>
      <RenderHandler action="Edit">
        {() => <div>You must save for changes to take effect.</div>}
      </RenderHandler>
      {/* Reference the DataHandler's data using the `context` prop */}
      <RenderHandler action={['New', 'Edit']} context="spaceTypes">
        {/* the context we referenced will augment the handler with args passing the data */}
        {(tao, data, spaceTypes) => (
          {/* pass the spaceTypes into the Form via the types prop */}
          <Form Space={data.Space} editing={tao.a === 'Edit'} types={spaceTypes} />
        )}
      </RenderHandler>
      <RenderHandler action="View">
        {(tao, data) => <View Space={data.Space} />}
      </RenderHandler>
    </SwitchHandler>
  </DataHandler>
);

export default SpaceContainer;
```
