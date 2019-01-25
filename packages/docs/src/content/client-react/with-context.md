# `@tao.js/react` withContext Higher-Order Component

`withContext` is a [Higher-Order Component (HOC)](https://reactjs.org/docs/higher-order-components.html)
in the `@tao.js/react` package allowing a different way to integrate standard React `Component`s
with the TAO by providing access to common functionality used by the other components in the
`@tao.js/react` package.

It's expected most of integrating our React app with the TAO using the `@tao.js/react` package will
be using the [`RenderHandler`](render-handler.md), [`SwitchHandler`](switch-handler.md) and
[`DataHandler`](data-handler.md).

However, there may be cases or contexts in which our React `Component` has a different type of
dependency on the TAO other than what is covered by those 3 components from the package, so we have
the `withContext` HOC available to wrap our React `Component` with a TAO handler to provide some
flexibility.

## importing

`withContext` is a named export from the `@tao.js/react` package.

```javascript
import { withContext } from '@tao.js/react';
```

OR

```javascript
const withContext = require('@tao.js/react').withContext;
```

## Using `withContext` to create an HOC

Technically, `withContext` itself is **not** an HOC, but is a function we use to create an HOC.

This is a common pattern in use with HOC functions found in other libraries that we are provided
with a function that we call to _create an HOC_ with some specific context information and then we
use the returned HOC to wrap standard React `Component`s.

```javascript
const UserHOC = withContext(
  // first arg is a tao trigram
  { t: 'User', a: 'Enter', o: 'Portal' },
  // second arg is a handler function
  (tao, data) => ({ user: data.User }),
  // third arg is a default value or function for the data prop
  { user: null }
);
```

In the example above, we have created the `UserHOC` (or User Higher-Order Component) that can be
used to wrap any of our React `Component`s somewhere in our app to receive a `data` prop with the
value obtained from anytime the `{User,Enter,Portal}` AppCon is set on the TAO.

### `withContext` args

The `withContext` function takes 3 args that will be described in greater detail in the following
sections:

* `tao` is the handler trigram definition just like for a standard TAO handler
* `handler` is a handler function just like a standard TAO handler but with some additional args &
  behaviors
* `default` is either an `Object` or a no arg `Function` that returns an `Object` used to set the
  default state of the `data` prop for wrapped components

## Defining the handler Trigram

Use the first arg to `withContext` to define the Trigram the handler is listening for.  In this
way, `withContext` is the same as defining any handler directly on the TAO, expecting a single `Object` with any or all of the trigram keys (`t` or `term`for term, `a` or `action` for action,
`o` or `orient` for orient).

```javascript
withContext({ t: 'User', a: 'Enter', o: 'Portal' }, …);
// OR
withContext({ term: 'User', action: 'Enter', orient: 'Portal' }, …);
```

### Defining Multiple Trigrams

Just like with a standard TAO handler, it's possible to use wildcard definitions for the trigram
of our `withContext` HOC.  This is done by either ommitting the trigram key for the desired wildcard
or by providing an empty string (`""`) as the prop value.

Additionally, as a convenience provided in the `@tao.js/react` package, using `withContext` we can
specify multiple values for any Trigram key to capture more than one **specific** AppCon (remember,
a wildcard will match any).  This is done using an `Array` of values for the key, e.g.:

```javascript
withContext({ t: ['User', 'Role'], a: ['Enter', 'Leave'], o: 'Portal' }, …);
// OR
withContext({ term: ['User', 'Role'], action: ['Enter', 'Leave'], orient: 'Portal' }, …);
```

Based on the above example, the resulting HOC have handlers for the following trigrams:

* `{User,Enter,Portal}`
* `{User,Leave,Portal}`
* `{Role,Enter,Portal}`
* `{Role,Leave,Portal}`

## Defining the handler Function

The handler function is the second arg to `withContext` and has the signature of a standard TAO
handler.  The handler function will be called like all other TAO handlers when an AppCon matching
the trigram(s) defined in the first arg to `withContext` is set on the TAO.

It is not possible to use the `withContext` function to create an HOC for wrapping React
`Component`s without providing a function as the second (handler) arg to `withContext`.  This is
because it doesn't make any sense to define an HOC using `withcontext` that has no handler.  If the
handler arg is not provided, and `Error` will be thrown.

However, unlike a standard TAO Inline Handler function where all return values that are not an
instance of an `AppCtx` used for [chaining](../basics/chaining.md) are ignored, the HOC created
using `withContext` is using the handler function to set the value used for the `data` prop on
the `Component` it is wrapping, which provides the following behaviors:

* if the return value is **not** an instance of `AppCtx` from `@tao.js/core`, then the value
  will be merged with the existing value for the `data` prop on the wrapped `Component`
* if the return value from the handler function is an instance of `AppCtx` from `@tao.js/core`,
  it will be returned to the TAO and used to set the context on the TAO as an [AppCon chain](../basics/chaining.md)
* if there is no return value, the existing value will be used for the `data` prop on the wrapped
  `Component`

Let's dive into usage with these behaviors below.

### Using the handler to return data

The first behavior mentioned above is returning a value that is **not** an instance of an `AppCtx`
from `@tao.js/core`.  This is the primary usage scenario when using `withContext` so we'll tackle
it first.

When defining the handler function, whatever value is returned will be **shallow merged** with the
existing data to generate the `data` prop added to the wrapped `Compoonent`.  This shallow merging is
intentional to mimic the behavior of React's `Component.setState` in order to allow the HOC to modify
and maintain its state based on varying and different context brought about by multiple AppCons as
they are set over time.

Here's a simple example we've already seen:

```javascript
const UserHOC = withContext(
  // first arg is a tao trigram
  { t: 'User', a: 'Enter', o: 'Portal' },
  // second arg is a handler function
  (tao, data) => ({ user: data.User }),
  …
);
```

From this example, when the `{User,Enter,Portal}` AppCon is set on the TAO, the HOC handler will
be called with that trigram as the `tao` arg and whatever `data` has been set with the AppCon.  In
our handler's case, it's looking for the `data.User` (from the term) and returning an object with
that `User` data set as the `user` key.  The wrapped component will receive a `data` prop with the
shape:

```javascript
{ user: … }
```

#### Leveraging the Merging of Data

Suppose we need our handler to handle more than one AppCon like:

```javascript
const UserHOC = withContext(
  // first arg is a tao trigram
  { t: ['User', 'Role'], a: ['Enter', 'Leave'], o: 'Portal' },
  // second arg is a handler function
  (tao, data) => {
    if (tao.a === 'Leave') {
      return tao.t === 'User' ? { user: undefined } : { role: undefined };
    }
    if (tao.t === 'User') {
      return { user: data.User };
    }
    return { role: data.Role };
  },
  …
);
```

From this example, our handler is able to only have to return the portion of the state it
needs to change in relation to the AppCon that is being handled.  When the `{User,Leave,Portal}`
is set on the TAO, it's resetting the `user` key in the state as opposed to when the
`{Role,Leave,Portal}` has been set, the `role` key is reset in the state, and so forth.

We expect the `data` prop of the wrapped component to have the shape:

```javascript
{
  user: …,
  role: …
}
```

### Third (`set`) and Fourth (`current`) args to handler

There may be situations, and we'll [see one below](#modifying-state-data-and-chaining) where we
want to set the state for the `data` prop **within** the handler function rather than rely on
the return value and the [shallow merging behavior](#leveraging-the-merging-of-data) above.

For these cases, the handler function has 2 additional args passed to it when called which differs
from a standard TAO handler:

* `set` is a function that takes a single arg and sets the `data` prop state to whatever value
  is passed in that arg
* `current` is the current `data` prop state

This allows us to have more flexibility and control with the logic we provide in our handler
function to `withContext`, specifically:

#### `set` arg

Using the `set` function passed as the third arg to our handler function, we have the ability
to set the complete state of the `data` prop for our wrapped component.  Using this we bypass
the [shallow merging behavior](#leveraging-the-merging-of-data) described above which is done as a
convenience for the majority of use cases.

Instead of shallow merging the state like when we return a value from the handler function, using
the function from the `set` arg will set the state of the data prop to the object passed into
the `set` arg function.

As an example, we'll create an HOC that manages the roles a user can have within our app:

```javascript
const RolesHOC = withContext(
  // first arg is a tao trigram
  { t: ['User', 'Role'], a: ['Enter', 'Leave'], o: 'Portal' },
  // second arg is a handler function
  (tao, data, set, current) => {
    const updatedData = {
      roles: new Set(current.roles),
    };
    if (tao.a === 'Leave') {
      if (tao.t === 'User') {
        updatedData.roles.clear();
      }
      else {
        updatedData.roles.delete(data.Role);
      }
    }
    else {
      if (tao.t === 'Role') {
        updatedData.role.add(data.Role);
      }
    }
    set(updatedData);
  },
  …
);
```

For our `RolesHOC` we need to keep track of the roles that the user is entering and leaving and
make them accessible to wrapped components.  To do this, we are managing the state of `roles` data
using a `Set` so we can't return an object with a `roles` key that will be shallow merged with the
existing state object.

#### `current` arg

You can see in the example above illustrating the use of the [`set` arg](#set-arg) that the fourth
arg is the `current` value of the state of the data prop.  This is passed so that we can make use
of this value when setting or updating the state.

`current` can also be used when returning an object to shallow merge state in circumstances where
the existing state can determine the future state of our data prop.

### Calling `set` prevents shallow merge

So that there isn't any confusion or conflicting behavior, if the function in the `set` arg to
our handler function is called, this call prevents any shallow merging of returned data from the
handler function.

If data is returned from the handler function and the function in the `set` arg was called during
execution of the handler function, the data will not be used to shallow merge with the current
state of the data prop.

### Using the handler to chain to another AppCon

Because the handler provided to the `withContext` HOC generating function is to be a TAO handler,
the capability to chain to another AppCon works like a standard TAO handler in that if the handler
function passed as the second arg to `withContext` returns an instance of an `AppCtx` from the
`@tao.js/core` package, then that will be returned to the TAO to chain onto that AppCon by setting
it in the TAO.

Additionally, the shallow merge **will not occur** in the state of the data prop in the `withContext`
created HOC.

#### Modifying state data AND chaining

Because it may be desired to both update the state of the `data` prop passed to the wrapped
component AND chain to another AppCon by returning an `AppCtx`, we can use the `set` (3rd) arg to our
handler function to set the state of the data prop and still return an `AppCtx`.

Extending our example from above regarding using the [`set` arg function](#set-arg):

```javascript
const RolesHOC = withContext(
  // first arg is a tao trigram
  { t: ['User', 'Role'], a: ['Enter', 'Leave'], o: 'Portal' },
  // second arg is a handler function
  (tao, data, set, current) => {
    const updatedData = {
      roles: new Set(current.roles),
    };
    if (tao.a === 'Leave') {
      if (tao.t === 'User') {
        updatedData.roles.clear();
      }
      else {
        updatedData.roles.delete(data.Role);
      }
    }
    else {
      if (tao.t === 'Role') {
        updatedData.role.add(data.Role);
      }
    }
    set(updatedData);
    // chain to a new AppCon that is the same as the current AppCon w/ orient=Reporting
    return new AppCtx(tao.t, tao.a, 'Reporting', data);
  },
  …
);
```

### Return nothing from the handler

In our third behavior, we have returning nothing (`undefined` or `null`) from our handler function.

The effect this has on our execution is that if nothing is returned, then nothing will happen or
change the `data` prop state.  Additionally, this will not trigger a re-render of our `withContext`
HOC because it will not call `setState` on the wrapping component.

This gives us the option within our handler function to determine whether there is a need for a
re-render or not, and return something to that effect.

From our `RolesHOC` example above, in the case of an AppCon with trigram `{User,Enter,Portal}`,
the handler function doesn't return anything explicitly (essentially `undefined` is returned) and
does not call the function from the `set` (3rd) arg to the handler function, so it will not trigger
a re-render of the component or its children.

## Setting the Default Value

The third arg to the `withContext` function is how we set the default value for the state of the
data prop before any matching AppCons are set in the TAO.

The `default` arg can be either:

* an `Object` which will be used to initialize default state for the data prop
* a `Function` that returns an `Object` that when called will be used to initialize the state for
  the data prop

Repeating our very first example above:

```javascript
const UserHOC = withContext(
  // first arg is a tao trigram
  { t: 'User', a: 'Enter', o: 'Portal' },
  // second arg is a handler function
  (tao, data) => ({ user: data.User }),
  // third arg is a default value or function for the data prop
  { user: null },
);
```

In the above example, our default (3rd) arg to the `withContext` function is is initializing the
state of the data prop to:

```javascript
{
  user: null
}
```

It could just as easily be written using a `Function` with the exact same result:

```javascript
const UserHOC = withContext(
  // first arg is a tao trigram
  { t: 'User', a: 'Enter', o: 'Portal' },
  // second arg is a handler function
  (tao, data) => ({ user: data.User }),
  // third arg is a default value or function for the data prop
  () => ({ user: null })
);
```
