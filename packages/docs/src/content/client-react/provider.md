# `@tao.js/react` Provider Component

The first `Component` we use as part of the declarative React API to integrate tao.js is the
`Provider` component.  The `Provider` provides the TAO (or optionally an individual [`Kernel`](../advanced/kernels.md))
using the React Context API to the other `@tao.js/react` components below the `Provider` in the
hierarchy tree so those components can attach handlers.

Additionally, the `Provider` creates a root data context used for sharing data between components
of `@tao.js/react`.

## importing

`Provider` is a named export from the `@tao.js/react` package.

```javascript
import { Provider } from '@tao.js/react';
```

OR

```javascript
const Provider = require('@tao.js/react').Provider;
```

## props

`Provider` has a single **required** `prop`:

* `TAO` - must be a `@tao.js/core` `Kernel` - usually this will be the default export from `@tao.js/core`

## Usage

Generally we'll use the `Provider` in our root `App` component to wrap the entire application
so all of our components below will use the same TAO `Kernel` and data context.

### `App.js`

```javascript
import React from 'react';
import TAO from '@tao.js/core';
import { Provider } from '@tao.js/react';
import AppComponents from './components';

const App = () => (
  <Provider TAO={TAO}>
    <AppComponents />
  </Provider>
);

export default App;
```

## Advanced Usage

The `Provider` is designed along the TAO's philosophy of providing a universal point on which
to attach handlers so any point in the application can be extended or listened for.  Additionally
the `Provider` uses this same philosophy with providing a shared data context to its descendants,
where each [`DataHandler`](data-handler.md) component uses a unique `name` to separate the data
it is adding to the data context from other data added to the data context under a single `Provider`.

### Separating Data Contexts

You may want to leverage multiple `Provider`s in your component hierarchy to have different shared
state.

### Separating `Kernel`s

The TAO is designed to provide a universal event stream for your whole system of apps, including the
client apps you write with React.  This is why the normal usage is to import the default `TAO` from
`@tao.js/core` and set it on a top-level `Provider` in your React application.

However, if you do make use of creating your own `Kernel`s, then you can do that to separate sections
of your app by assigning them to `Provider`s at different points of your component hierarchy
