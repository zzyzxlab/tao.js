# `@tao.js/react` RenderHandler Component

The main React `Component` used to integrate the TAO with our React app is the `RenderHandler`.

_(All of the description below assumes a single `TaoProvider` at the root of our React App._
_Please see the [`TaoProvider`](provider.md#advanced-usage) doc page for more about advanced usage)_

The `RenderHandler` _is a_ React `Component` **and a** TAO handler attached to listen for AppCons
matching its configured Trigram.

## importing

`RenderHandler` is a named export from the `@tao.js/react` package.

```javascript
import { RenderHandler } from '@tao.js/react';
```

OR

```javascript
const RenderHandler = require('@tao.js/react').RenderHandler;
```

## Defining the handler Trigram

Use the `term`, `action` and `orient` props on the `RenderHandler` to define the Trigram the handler
is listening for.

```javascript
<RenderHandler term="Space" action="View" orient="Portal">
```

### Defining Multiple Trigrams

Just like with a standard TAO handler, it's possible to use wildcard definitions for the Trigram
of our `RenderHandler`.  This is done by either ommitting the Trigram prop for the desired wildcard
or by providing an empty string (`""`) as the prop value.

Additionally, as a convenience provided in the `@tao.js/react` package, all components can specify
multiple values for any Trigram prop to capture more than one **specific** AppCon (remember, a
wildcard will match any).  This is done using an `Array` of values for the prop, e.g.:

```javascript
<RencerHandler term={['User', 'Role']} action={['New', 'Edit']} orient="Portal">
```

When a Trigram prop on a `RenderHandler` has more than one value, the `RenderHandler` will calculate
the cartesian product to determine all of the Trigrams to which the handler should be attached.

Using the above example code, that `RenderHandler` would attach a handler to the following Trigrams
on the TAO:

* `{User,New,Portal}`
* `{User,Edit,Portal}`
* `{Role,New,Portal}`
* `{Role,Edit,Portal}`

## Defining the handler Function

The handler function of the `RenderHandler` is defined as the child of the `RenderHandler` which
makes use of the [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
pattern from React.

The function child of `RenderHandler` has the same signature as a regular TAO handler and will be
called only when an AppCon matching one of the `RenderHandler`'s Trigrams matches, same as any other
TAO handler.

```javascript
<RenderHandler term="Space" action="View" orient="Portal">
  {(tao, data) => (
    <div>
      <span className="space-title">{data.Space.name}</span>
      …
    </div>
  )}
</RenderHandler>
```

`RenderHandler`s have _render_ in the name to make it explicit that their children will only
render once their handler is called.

## Overriding Initial Render Behavior

It is possible to make the `RenderHandler` initially render when it is part of the component
tree by setting a truthy value on the `shouldRender` prop.

The implication of this is that the `RenderHandler` will always render its children to the tree
**and** the [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
will be called with the following:

* before any AppCons matching the `RenderHandler`'s Trigram have been set on the TAO, the
  `tao` and `data` args will be `undefined`
* after any AppCons matching the `RenderHandler`'s Trigram(s) have been set on the TAO, the
  **last values** of `tao` and `data` will be passed in the args

```javascript
<RenderHandler term="Space" action="View" orient="Portal" shouldRender={true}>
  {(tao, data) => {
    if (!data || !data.Space) {
      return (
        <div><span>Nothing to see here</span></div>
      );
    }
    return (
      <div>
        <span className="space-title">{data.Space.name}</span>
        …
      </div>
    );
  }}
</RenderHandler>
```

It will be up to the component author to account for this behavior.

## Consuming shared state (named DataHandler data)

> The `RenderHandler` `context` prop (and the positional args it appended to the
> function-as-a-child) was deprecated in 0.17 and **removed in 0.21**.

To consume data shared by a [`DataHandler`](data-handler.md), read it in any descendant
component with the [`useTaoData(name)` hook](hooks.md#usetaodata) — the `RenderHandler`
children stay `(tao, data) => …`:

### `App.js`

```javascript
import React from 'react';
import TAO from '@tao.js/core';
import { TaoProvider, DataHandler } from '@tao.js/react';
import AppComponents from './components';

const App = () => (
  <TaoProvider TAO={TAO}>
    <DataHandler
      name="user" term="User" action="Enter" default={null}
      handler={(tao, data) => data.User}>
      <AppComponents />
    </DataHandler>
  </TaoProvider>
);

export default App;
```

### `components/Account/index.js`

```javascript
import React from 'react';
import { RenderHandler, useTaoData } from '@tao.js/react';
…
import AccountSettings from './AccountSettings.js';

// reads the 'user' data from the nearest DataHandler named "user"
const AccountEditor = ({ account }) => {
  const user = useTaoData('user');
  return <AccountSettings account={account} user={user} … />;
};

const Account = () => (
  …
  <RenderHandler term="Account" action="Edit" orient="Portal">
    {(tao, data) => <AccountEditor account={data.Account} />}
  </RenderHandler>
  …
);

export default Account;
```

To consume more than one named value, call `useTaoData` once per name — lookups walk the
React ancestor chain, so the nearest `DataHandler` with a matching `name` wins and sibling
subtrees stay isolated:

```javascript
const AccountEditor = ({ account }) => {
  const user = useTaoData('user');
  const roles = useTaoData('roles');
  const location = useTaoData('location');
  return (
    <AccountSettings account={account} user={user} roles={roles} location={location} />
  );
};
```
