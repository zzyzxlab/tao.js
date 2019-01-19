# Using with [React.js](https://reactjs.org)

It's assumed you have read and are familiar with the [Basics](../basics/README.md) guide.
If not, then please go back and read through that before trying to learn how to use tao.js
with React.

While `tao.js` itself is client-agnostic, we provide packages to make it
seemlessly work with client UI libraries and frameworks.

To start we only have an implementation for [React.js](https://reactjs.org).
Upcoming and asking for volunteers to help with packages to integrate:

* [Vue.js](https://vuejs.org)
* [Angular.js](https://angularjs.org)
* [Ember.js](https://emberjs.com/)
* Other UI frameworks (please help)

`tao.js` works seamlessly well with React given the philosophy of building
reactive applications at the heart of building applications with `tao.js`.

To work with React, we make sure to install the `@tao.js/react` package:
```sh
npm install --save @tao.js/core @tao.js/react
```
_`@tao.js/core` is listed as a `peerDependency` for the react package so you
must install that as well or the package won't work._

This is the second stab at a set of components to work with React.  The [original version](orig-api)
was a very simple way to get a working version of a React-based library out the door.  However,
that version was much more TAO-centric than it was React-centric.  You're more than welcome
to use the original version if you like it better (it is simpler).

The new version provides a **declarative API** that is more React-like that developers have
come to expect when building applications using React, leveraging the
[React Context API](https://reactjs.org/docs/context.html) underneath so you must be
using at least version 16 of React.

The package provides 5 `Component`s and 1 Higher-Order Component (HOC) we can mix and match to
integrate `tao.js` within our React UI:

* [Provider](provider.md) - `Component` that provides context to the other components in the
  package so that they can interact with the TAO (or individual [`Kernel`](../advanced/kernels.md))
  and shared root data store
* [RenderHandler](render-handler.md) - a `Component` that _is also_ a TAO handler that responds
  to AppCons by rendering its [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
  using the same signature as a regular TAO handler
* [SwitchHandler](switch-handler.md) - a `Component` that _is also_ a TAO handler used to wrap
  a set of `RenderHandler`s to decide which `RenderHandler`s to include in the view.
* [withContext](with-context.md) - a Higher-Order Component (HOC) that turns the `Component` it is
  wrapping _into a_ TAO handler that will receive `data` from AppCons
* [DataHandler](data-handler.md) - a `Component` that _is also_ a TAO handler used to capture
  `data` from AppCons in response to configured Trigram(s) and make the data available to all child
  & descendant components for consumption
* [DataConsumer](data-consumer.md) - a `Component` used to consume data supplied by `DataHandler`s

## Example Usage

Here's an example we'll progress through using the various `Component` exports from the
`@tao.js/react` package to control display of `Component`s and provide them with data based
on the AppCons generated during the lifecycle of the application.  We'll use the same
[Example Application](../basics/defining-app-cons.md#example-application) to illustrate integrating
React here.

### Example Directory Structure

Part of the Application deals with `Space`s so it has the following directory:

```
src/
+- components/
   +- Space/
      - index.js
      - Form.js
      - List.js
      - View.js
   +- shared/
      - ErrorMessage.js
- App.css
- App.js
```

## Defining React `Component`s

The `Component` definitions for `ErrorMessage`, `Form`, `List` and `View` define basic
React `Component`s (both functional and class) and are _**not aware**_ of _**nor dependent upon**_
the `@tao.js/react` package.

They _are_ making use of the TAO export from `@tao.js/core` in
order to set the Application Context.

### `src/components/space/view.js`

Here is an example of a functional `Component`:

```javascript
import React from 'react';
import TAO from '@tao.js/core';

const SpaceView = ({ Space }) => (
  <div>
    <h1>Space - {Space.name}</h1>
    <button
      onClick={e =>
        TAO.setCtx({ t: 'Space', a: 'Edit', o: 'Portal' }, { Space })
      }
    >
      Edit
    </button>
    <button onClick={e => TAO.setCtx({ t: 'Space', a: 'Find', o: 'Portal' })}>
      Back to List
    </button>
    <p>{Space.description}</p>
  </div>
);

export default SpaceView;
```

Our `SpaceView` component expects to receive a `Space` prop which is the `Space` object it
is to display.

The `SpaceView` has 2 buttons used to change the user's context of the application by
[setting an AppCon on the TAO](../basics/setting-app-cons.md) to either edit the current
`Space` or find all of the `Space`s again and list them.

### `src/components/space/Form.js`

Here is an example full class `Component` for a simple form used to Edit a Space or Create
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
    const { editing } = this.props;
    const Space = this.state;
    const saveAction = editing ? 'Update' : 'Add';
    TAO.setCtx({ t: 'Space', a: saveAction, o: 'Portal' }, { Space });
    event.preventDefault();
  };

  handleCancel = event => {
    event.preventDefault();
    const { Space: { _id } = {} } = this.props;
    TAO.setCtx({ t: 'Space', a: 'Find', o: 'Portal' }, { Find: { _id } });
  };

  render() {
    const { editing } = this.props;
    const Space = this.state;
    return (
      <div>
        <h1>
          {a} Space {Space.name ? `- ${Space.name}` : ''}
        </h1>
        <form name={`${a}Space`} onSubmit={this.handleSubmit}>
          {editing ? <input type="hidden" name="_id" value={Space._id} /> : null}
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
          <input type="submit" value="Save" />
          &nbsp;
          <button onClick={this.handleCancel}>Cancel</button>
        </form>
      </div>
    );
  }
}

export default SpaceForm;
```

Our `SpaceForm` component expects to receive 2 props:

* `editing` telling it whether the form is editing an existing `Space` or creating a new one
* `Space` (optional) the space object being edited

The `SpaceForm` defines a `form` that will manage input changes using local state, and then
persist those changes by [setting an AppCon on the TAO](../basics/setting-app-cons.md) in its
`handleSubmit` method.

## Including Space Components in the App

Before we start to wire up our Space `Component`s to be controlled through the TAO, we'll
assume a default export from the `components/space` directory and include it in our App
so users can view and interact with `Space`s in the app.

We will surround our app with a `Provider` from the `@tao.js/react` package
that will be used to define which TAO Kernel (in this case the default TAO export) that
the `Component` handlers we define further down in the component tree will be attached to
and set up a shared data context available to those handlers.

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

## Wiring up `Component` Handlers for Display Rendering

### Basic Rendering with `RenderHandler`

First we will use the `RenderHandler` to add our `Space` components to the render tree when our
application encounters specific AppCons.

#### `src/components/space/index.js`

```javascript
import React, { Fragment } from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import {
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

const SpaceContainer = props => (
  <Fragment>
    <h2 class="title">Spaces</h2>
    <RenderHandler term="Space" action="List" orient="Portal">
      {(tao, data) => <List data={data.Space} />}
    </RenderHandler>
    <RenderHandler term="Space" action="View" orient="Portal">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
    <RenderHandler term="Space" action="Edit" orient="Portal">
      {() => <div>You must save for changes to take effect.</div>}
    </RenderHandler>
    <RenderHandler term="Space" action={['New', 'Edit'] orient="Portal"}>
      {(tao, data) => <Form Space={data.Space} editing={tao.a === 'Edit'} />}
    </RenderHandler>
    <RenderHandler term="Space" action="View" orient="Portal">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
  </Fragment>
);

export default SpaceContainer;
```

The `SpaceContainer` uses a `RenderHandler` to wrap each of our different space `Component`s
to be rendered based on when specific AppCons are encountered.  The Trigram for each handler
is defined using the `term`, `action` and `orient` props passed to the `RenderHandler`, and
the `RenderHandler` has a [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
with the exact same signature as any other TAO handler allowing us to return what we want
rendered in the DOM tree when the corresponding AppCon has been encountered.

All `Component` handlers from the `@tao.js/react` package are added to the TAO as Inline Handlers.
Any ommitted Trigram props (`term`, `action` or `orient`) will be treated as a wildcard
when adding the handler to the TAO just like when adding any normal handler to the TAO.

Additionally, you'll notice the `action` prop used in the `RenderHandler` for the `Form`
component which provides an array of actions.  As a convenience, the `RenderHandler` (and all
other `Component` handlers from the `@tao.js/react` package) will compute a cartesian product
of all possible Trigrams from the Trigram prop values provided and add itself as a
handler for each of them.

### Improved Rendering with `SwitchHandler`

`RenderHandler`s behave just like normal TAO handlers reacting to an AppCon but they do not
react to other AppCons to which they are not configured to handle.  In React terms, this
translates to adding their children to the render tree once their configured AppCon has been
encountered in the TAO, but not controlling removal.  This means the `SpaceContainer` we
defined above will progressively show each of our `Space` components as users interact with
the app, but none of these components will disappear.

To have the selective rendering behavior we need, we'll convert the `SpaceContainter` into
using a `SwitchHandler` to ensure only the desired space `Component`s we want displayed are
rendered and will be removed when the application has moved on from the configured AppCons.

#### modified `src/components/space/index.js`

```javascript
import React from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import {
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

const SpaceContainer = props => (
  {/* surround RenderHandlers with a SwitchHandler */}
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
    <RenderHandler action={['New', 'Edit']}>
      {(tao, data) => <Form Space={data.Space} editing={tao.a === 'Edit'} />}
    </RenderHandler>
    <RenderHandler action="View">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
  </SwitchHandler>
);

export default SpaceContainer;
```

The `SwitchHandler` is now providing control over its child `RenderHandler`s by determining
based on the AppCons it sees which should be included in the render tree.

To reduce verbosity, the `SwitchHandler` accepts Trigram props that act as default Trigram
props for all child `RenderHandler`s and will be passed into the child `RenderHandler`s when
they're added to the render tree.  If a Trigram prop is defined by both, the `RenderHandler`'s
value will override the `SwitchHandler`'s value both in determining the Trigram of the TAO
handler the `SwitchHandler` uses and on the `RenderHandler` component added to the render
tree.

The configuration of surrounding `RenderHandler`s with a `SwitchHandler` is to provide
exclusivity aka selection around which `RenderHandler`s to display.  It isn't necessary
for all `RenderHandler`s to be surrounded by a `SwitchHandler`, especially if the children
of the `RenderHandler` can control their own display (like we'll see with the `ErrorMessage`.

The `SwitchHandler` only manages selective rendering for `RenderHandler` **direct children**,
meaning any descendant `RenderHandler`s are unaffected by an ancestor `SwitchHandler`.  It
also means the `SwitchHandler` will render any other children (`Component`s or text) into the
tree (e.g. the `h2` title will always be in the render tree as long as the `SpaceContainer`
is in the render tree).

## Getting data from AppCons into Components

### Using `withContext` HOC

The `withContext` Higher-Order Component can be used to turn any React `Component` into a
TAO handler that will receive data from an AppCon when it is encountered.

As a very simple example, say we want to have a welcome message for users of the app.

#### `src/components/shared/welcome.js`

```javascript
import React from 'react';
import { withContext } from '@tao.js/react';

const Welcome = ({ data }) => (
  <h2>Welcome{data.user ? ', ' + data.user.displayName : ' to Mypos'}!</h2>
);

export default withContext(
  { t: 'User', a: 'Enter', o: 'Portal' },
  (tao, data) => ({ user: data.User }),
  () => ({ user: null })
)(Welcome);
```

The `withContext` HOC wraps our `Welcome` component to provide the `User` data when it
is encountered during a `{User,Enter,Portal}` AppCon.  The return value of the handler
passed in as the 2nd arg to `withContext` is used to determine the shape of the `data`
prop that `withContext` will pass to the `Welcome` component.
The 3rd arg to `withContext` is used to set the default value of the `data` prop before
any AppCons are encountered.

Now our global header or App copmonent can import the default export from `src/components/shared/welcome.js`
and embed it in the page within a `Provider` and it'll just work like any other React `Component`.

#### `src/App.js` with Welcome

```javascript
import React, { Component } from 'react';
import TAO from '@tao.js/core';
import { Provider } from '@tao.js/react';
import logo from './logo.svg';
import './App.css';
import SpaceContainer from './components/space';
import Welcome from './components/shared/welcome';

class App extends Component {
  render() {
    return (
      <Provider TAO={TAO}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to Mypos</h1>
            <Welcome />
          </header>
          <SpaceContainer />
        </div>
      </Provider>
    );
  }
}

export default App;
```

The `withContext` HOC has much more flexibility that you can find in the [doc page](with-context.md).

### Using `DataHandler`s for shared state

`DataHandler`s provide a way to wire up TAO handlers into your React `Component` tree that capture
data and make it available to child and decendant components down the hierarchy.

The `Provider` sets up the initial data context as a map, and `DataHandler`s will modify that map
when they react to their configured AppCons.

Let's say we want to classify `Space`s using a `type` field so we need a list of `type`s as a
lookup.  We'll modify our `SpaceContainer` to capture this list and make it available to it's
children.

#### `src/components/space/index.js` with types

```javascript
import React from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import {
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

Above we've added a few changes to our `space/index.js` and `SpaceContainer` component without
having to create new components or new files.

First, we add a new Async Handler to fetch the `SpaceType`s lookup data when entering the app.

Next we add a `DataHandler` component to react to the `{SpaceType,List,Portal}` AppCon which
will be triggered when successfully fetching the `SpaceType`s from the backend.  The `DataHandler`'s
handler is defined to return just the list of `SpaceType`s in the AppCon `data`, which then sets
that value in the data context from the closet ancestor `Provider` in the component hierarchy using
the `name` prop of the `DataHandler` (in this case `'spaceTypes'`).

We get access to this data lower down in the hierarchy when we define the `context` prop on the
`RenderHandler` surrounding our space `Form` (`context="spaceTypes"`).  When we add the `context`
prop to the `RenderHandler`, it finds the data in the data context under the key(s) [multiple
contexts may be provided using an `Array` of context names - see the [RenderHandler](render-handler.md) docs]
and append that data as args to the handler used as the [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
of the `RenderHandler` (if multiple `context`s are provided, then each is appended as an arg in
the order in which they're listed in the prop value).

Finally, in the [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render) prop of the
`RenderHandler` we capture the `spaceTypes` arg and pass it to the `Form` component as the value of
the `types` prop.

### Using `DataConsumer`s for easy consumption of shared stata

Above we saw how a `RenderHandler` can use the `context` prop to get access to the shared state
a `DataHandler` will add to the data context created by a `Provider`.

If we want to consume this shared state without being dependent upon a `RenderHandler` to be
rendered only when a specific or set of AppCons are encountered in the TAO, we can use the
`DataConsumer` component to get the data and pass it down to its children using the same
[function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
pattern but without the TAO handler part.

For example, let's assume that only paid users can view the details of a Space.

