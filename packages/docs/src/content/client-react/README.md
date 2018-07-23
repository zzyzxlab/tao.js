# Using with [React.js](https://reactjs.org)

While `tao.js` itself is client-agnostic, we provide packages to make it
seemlessly to work with client UI libraries and frameworks.

To start we only have an implementation for [React.js](https://reactjs.org).
Upcoming and asking for volunteers to help with packages to integrate:

* [Vue.js](https://vuejs.org)
* [Angular.js](https://angularjs.org)
* [Ember.js](https://emberjs.com/)
* Other UI frameworks (please help)

`tao.js` works seamlessly well with React given the philosophy of building
reactive applications at the heart of building applications with `tao.js`.

To work with React, make sure to install the `@tao.js/react` package:
```sh
npm install --save @tao.js/react
```
_`@tao.js/core` is listed as a `peerDependency` for the react package so you
must install that as well or the package won't work._

There are 2 items you will import and work with to integrate `tao.js` within your
React UI:

* [Provider](client-react/provider.md) - a `class` that turns your React `Component`s into
  [Handlers for AppCons](../basics/handlers.md)
* [Reactor](client-react/reactor.md) - a React `Component` that uses a `Provider` to react to
  [AppCons](../basics/app-cons.md) in order to render your React `Component`s into the UI

## Example

Here's a simple example of using a `Provider` and `Reactor` to control display of `Component`s
in the UI.

### Example Directory Structure

Part of the Application deals with `Space`s so it has the following directory:

```
src/
+- components/
   +- Space/
      - index.js
      - ErrorMessage.js
      - Form.js
      - List.js
      - View.js
- App.css
- App.js
```

### Defining React `Component`s

The `Component` definitions for `ErrorMessage`, `Form`, `List` and `View` define basic
React `Component`s (both functional and class) and are not _aware_ of nor dependent upon
the `@tao.js/react` package.

They _are_ making use of the TAO export from `@tao.js/core` in
order to change the Application Context.

#### `src/components/space/List.js`

Here is an example functional `Component`:

```javascript
import React from 'react';
import TAO from '@tao.js/core';

const SpaceItems = ({ spaces }) =>
  spaces.map(s => {
    const Space = s;
    return (
      <li key={s._id}>
        <button
          onClick={e =>
            TAO.setCtx({ t: 'Space', a: 'Enter', o: 'Portal' }, { Space })
          }
        >
          {s.name}
        </button>
      </li>
    );
  });

const SpaceList = ({ Space }) => (
  <div>
    <h1>Current list of Spaces</h1>
    <h3>
      <button onClick={e => TAO.setCtx({ t: 'Space', a: 'New', o: 'Portal' })}>
        New
      </button>
    </h3>
    <ul>
      <SpaceItems spaces={Space} />
    </ul>
  </div>
);

export default SpaceList;
```

#### `src/components/space/Form.js`

Here is an example full `Component` for a simple form used to Edit a Space or Create
a new Space.

```javascript
import React, { Component } from 'react';
import TAO from '@tao.js/core';

class SpaceForm extends Component {
  constructor(props) {
    super(props);
    this.state = Object.assign(
      {
        name: '',
        description: ''
      },
      props.Space
    );
  }

  handleChange = event => {
    const target = event.target;
    const val = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: val
    });
  };

  handleSubmit = event => {
    const { a } = this.props;
    const Space = this.state;
    const isNew = a === 'New';
    const saveAction = isNew ? 'Add' : 'Update';
    TAO.setCtx({ t: 'Space', a: saveAction, o: 'Portal' }, { Space });
    event.preventDefault();
  };

  handleCancel = event => {
    event.preventDefault();
    const { Space: { _id } = {} } = this.props;
    TAO.setCtx({ t: 'Space', a: 'Find', o: 'Portal' }, { Find: { _id } });
  };

  render() {
    const { a } = this.props;
    const Space = this.state;
    const isNew = a === 'New';
    return (
      <div>
        <h1>
          {a} Space {Space.name ? `- ${Space.name}` : ''}
        </h1>
        <form name={`${a}Space`} onSubmit={this.handleSubmit}>
          {isNew ? null : <input type="hidden" name="id" value={Space.id} />}
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            name="name"
            value={Space.name}
            onChange={this.handleChange}
          />
          <br />
          <label htmlFor="description">Description:</label>
          <textarea
            name="description"
            value={Space.description}
            onChange={this.handleChange}
          />
          <br />
          <input type="submit" value="Save" />&nbsp;<button
            onClick={this.handleCancel}
          >
            Cancel
          </button>
        </form>
      </div>
    );
  }
}

export default SpaceForm;
```

### Wiring up `Component`s as Handlers

We then use a Provider to wire up the Space `Component`s as Handlers for AppCons
generated through the course of interacting with the application, and expose a
Reactor that will embed the Components provided by the Provider into the React UI.

#### `src/components/space/index.js`

```javascript
import React from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import { Provider, Reactor } from '@tao.js/react';
import List from './List';
import View from './View';
import Form from './Form';
import ErrorMessage from './ErrorMessage';

TAO.addInlineHandler(
  { t: 'Space', a: 'Enter', o: 'Portal' },
  (tao, { Space }) => {
    return new AppCtx('Space', 'View', 'Portal', { Space });
  }
);

const spaceProvider = new Provider(TAO);
spaceProvider
  .setDefaultCtx({ term: 'Space', orient: 'Portal' })
  .addComponentHandler({ action: 'List' }, List)
  .addComponentHandler({ action: 'View' }, View)
  .addComponentHandler({ action: ['New', 'Edit'] }, Form);

const messageProvider = new Provider(TAO);
messageProvider.addComponentHandler({ action: 'Fail' }, ErrorMessage);

const SpaceRender = () => (
  <div>
    <Reactor key="spaceMessages" provider={messageProvider} />
    <Reactor key="spaceComponents" provider={spaceProvider} />
  </div>
);

export default SpaceRender;
```

### Including Space Components in the App

Our main `App` Component needs to then include the ability to view `Space`s so
we define it like this:

#### `src/App.js`

```javascript
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Space from './components/Space';

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
```

Above you will see that `App.js` imports the `default` export of the `./Space` directory,
which is exporting a Reactor `Component` that it embeds in the main UI.

The `Reactor`'s `Provider` will react to AppCon changes and tell the `Reactor` which
`Component` to render or none if the AppCon doesn't call for one.

