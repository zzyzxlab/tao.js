# `@tao.js/react` TaoProvider Component

The first `Component` we use as part of the declarative React API to integrate tao.js is the
`TaoProvider` component.  The `TaoProvider` provides the TAO (or optionally an individual
[`Kernel`](../advanced/kernels.md)) using the React Context API to the other `@tao.js/react`
components below the `TaoProvider` in the hierarchy tree so those components can attach handlers.

> `TaoProvider` was previously exported as `Provider`; the deprecated `Provider` alias was
> removed in 0.21.

## importing

`TaoProvider` is a named export (and the default export) from the `@tao.js/react` package.

```javascript
import { TaoProvider } from '@tao.js/react';
```

OR

```javascript
const TaoProvider = require('@tao.js/react').TaoProvider;
```

## props

`TaoProvider` has a single **required** `prop`:

* `TAO` - must be a `@tao.js/core` `Kernel` - usually this will be the default export from `@tao.js/core`

## Usage

Generally we'll use the `TaoProvider` in our root `App` component to wrap the entire application
so all of our components below will use the same TAO `Kernel`.

### `App.js`

```javascript
import React from 'react';
import TAO from '@tao.js/core';
import { TaoProvider } from '@tao.js/react';
import AppComponents from './components';

const App = () => (
  <TaoProvider TAO={TAO}>
    <AppComponents />
  </TaoProvider>
);

export default App;
```

## Advanced Usage

The `TaoProvider` is designed along the TAO's philosophy of providing a universal point on which
to attach handlers so any point in the application can be extended or listened for.  Named data
shared by [`DataHandler`](data-handler.md) components is tree-scoped: each `DataHandler` pushes
its `name`d data onto a layer stack read by the [`useTaoData(name)` hook](hooks.md#usetaodata),
where lookups walk the React ancestor chain (the nearest matching `name` wins and sibling
subtrees are isolated).

### Separating `Kernel`s

The TAO is designed to provide a universal event stream for your whole system of apps, including the
client apps you write with React.  This is why the normal usage is to import the default `TAO` from
`@tao.js/core` and set it on a top-level `TaoProvider` in your React application.

However, if you do make use of creating your own `Kernel`s, then you can do that to separate sections
of your app by assigning them to `TaoProvider`s at different points of your component hierarchy
