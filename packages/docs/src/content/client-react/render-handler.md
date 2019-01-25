# `@tao.js/react` RenderHandler Component

The main React `Component` used to integrate the TAO with our React app is the `RenderHandler`.

_(all of the description below assumes a single `Provider` at the root of our React App)_
_(please see the [`Provider`](provider.md#advanced-usage) doc page for more about advanced usage)_

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

## Consuming shared state from the data context

We mentioned before about [`Provider`](provider.md)s not just providing the common TAO Kernel
to the components below it but to also providing a shared data context.

We can find how to add data to the shared data context using a [`DataHandler`](data-handler.md),
and when we use this, every `DataHandler` has a required [`name` prop](data-handler.md#defining-the-data-context-name).

To consume this data in a `RenderHandler`, we use the `RenderHandler`'s `context` prop with the
name or names of the `DataHandler`s we want to consume data from the shared data context.

When using the `context` prop in a `RenderHandler`, the data set in the shared data context
from the `DataHandler` of the same `name` found in the `context` prop will be **appended as an arg**
to the [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
handler of the `RenderHandler`.

Here's an example of the `App` including the shared user of the app in the data context and the
user being consumed by a `RenderHandler` somewhere below:

### `App.js`

```javascript
import React from 'react';
import TAO from '@tao.js/core';
import { Provider, DataHandler } from '@tao.js/react';
import AppComponents from './components';

const App = () => (
  <Provider TAO={TAO}>
    <DataHandler
      name="user" term="User" action="Enter" default={null}
      handler={(toa, data) => data.User}>
      <AppComponents />
    </DataHandler>
  </Provider>
);

export default App;
```

### `components/Account/index.js`

```javascript
import React from 'react';
import { RenderHandler } from '@tao.js/react';
…
import AccountSettings from './AccountSettings.js';

const Account = () => (
  …
  <RenderHandler
    term="Account" action="Edit" orient="Portal"
    context="user"> {/* <-- name the 'user' context to consume the value set above */}
    { // the user value consumed from the data context is appended after the standard tao, data args
      (toa, data, user) => (
        <AccountSettings account={data.Account} user={user} … />
      )
    }
  </RenderHandler>
  …
);

export default Account;
```

### Consuming Multiple Contexts

To consume more than one named value from the shared data context, use an `Array` of `String`s
as the value for the `context` prop of the `RenderHandler`.

When we do this, the `RenderHandler` will append the data context values as args on the
[function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
in the order in which they're listed in the `context` array, e.g.:

```javascript
<RenderHandler
  term="Account" action="Edit" orient="Portal"
  context={['user', 'roles', 'location']}> {/* <-- setting multiple data context values to consume */}
  { // data context values are appended as args in the same order they are set in the context prop
    (toa, data, user, roles, location) => (
      <AccountSettings
        account={data.Account}
        user={user}
        roles={roles}
        location={location}
      />
    )
  }
</RenderHandler>
```
