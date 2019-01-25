# `@tao.js/react` DataHandler Component

A React `Component` that will register as a handler for a TAO trigram in order to set data in a
shared data context from its nearest ancestor [`Provider`](provider.md).  This data can then be
consumed by [`RenderHandler`s using the `context` prop](render-handler.md#consuming-shared-state-from-the-data-context).

The purpose of the `DataHandler` component is to react to specific AppCons set on the TAO and
add data to a shared state that can be leveraged by multiple other `Component`s in the render
hierarchy.

## importing

`DataHandler` is a named export from the `@tao.js/react` package.

```javascript
import { DataHandler } from '@tao.js/react';
```

OR

```javascript
const DataHandler = require('@tao.js/react').DataHandler;
```

## Defining the data context `name`

As we know from [`Provider`](provider.md), the data context is shared.  Each `DataHandler` **must**
define a `name` key used to distinguish the data it is putting in this shared data context.

This `name` is used by the `RenderHandler`'s [`context` prop](render-handler.md#consuming-shared-state-from-the-data-context)
as a way to find the data the `DataHandler` is adding to the shared data context and make it
available to teh `RenederHandler`'s children via its function as a child.

```javascript
<DataHandler name="user" … >
```

In the example above, all data manipulated by the `DataHandler` component will be in the shared
data context on the `"user"` key.

## Defining the handler Trigram

Use the `term`, `action` and `orient` props on the `DataHandler` to define the Trigram the handler
is listening for.

```javascript
<DataHandler name="user" term="User" action="Enter" orient="Portal" … />
```

### Defining Multiple Trigrams

Just like with a standard TAO handler, it's possible to use wildcard definitions for the Trigram
of our `DataHandler`.  This is done by either ommitting the Trigram prop for the desired wildcard
or by providing an empty string (`""`) as the prop value.

Additionally, as a convenience provided in the `@tao.js/react` package, all components can specify
multiple values for any Trigram prop to capture more than one **specific** AppCon (remember, a
wildcard will match any).  This is done using an `Array` of values for the prop, e.g.:

```javascript
<DataHandler name="auth" term={['User', 'Role']} action={['Enter', 'Leave']} orient="Portal" … />
```

When a Trigram prop on a `DataHandler` has more than one value, the `DataHandler` will calculate
the cartesian product to determine all of the Trigrams to which the handler should be attached.

Using the above example code, that `DataHandler` would attach a handler to the following Trigrams
on the TAO:

* `{User,Enter,Portal}`
* `{User,Leave,Portal}`
* `{Role,Enter,Portal}`
* `{Role,Leave,Portal}`

## Defining the handler Function

Unlike the [`RenderHandler`](render-handler.md), the `DataHandler` handler is defined using the
`handler` prop.  The `handler` prop expects a function that has the same signature as a TAO handler,
plus a few extra args to work for the purpose design of the `DataHandler` to provide data to
components below it.

Since the `DataHandler` component and the [`withContext`](with-context.md) function use the same
underlying implementation, for a full description of how the `handler` function behaves, please
review the `withContext` [handler function docs](with-context.md#defining-the-handler-function) for
all of the particulars and behaviors.

```javascript
  <DataHandler
    name="user"
    term="User"
    action="Enter"
    orient="Portal"
    handler={(tao, data) => data.User} // <-- handler returns the value used to set the key 'user' in the shared data context for consumption by children and descendants
  >
    …
  </DataHandler>
```

There is only a single difference between the `DataHandler` `handler` prop and the `withContext`
handler function:

### Not required

The `handler` prop is **not required** on a `DataHandler`. Whereas the `withContext` function will
throw an Error if the handler arg is not a `Function`, the `DataHandler` component will treat a
missing `handler` prop as the identity function.  In that way, if the `handler` function is not
defined, then whatever `data` value would be passed to the handler function upon a matching AppCon
being set on the TAO, the same `data` will be used to set the value of the [`name` key](#defining-the-data-context-name)
in the shared data context as if that `data` was the return value of the handler function (i.e.
a [shallow merge will take place](with-context.md#using-the-handler-to-return-data)).

## Initializing the state with the `default` prop

Before any AppCons matching the trigram props defined on the `DataHandler` are set on the TAO,
we can initialize the value for the `name` key in the shared data context using the `default`
prop.

```javascript
  <DataHandler
    name="user"
    term="User"
    action="Enter"
    orient="Portal"
    handler={(tao, data) => data.User}
    default={null} // <-- initialize the `user` key in the shared data context with the value `null`
  >
    …
  </DataHandler>
```

## Consuming shared state provided by the DataHandler

`RenderHandler`s are the components that consume the data provided by the `DataHandler` to the
shared data context.

Please take a look at the [`RenderHandler` consuming shared state docs](render-handler.md#consuming-shared-state-from-the-data-context)
for more about this topic.

## Mounting and Unmounting

The `DataHandler` has a particular relationship with the React `Component` Lifecycle that is
important to understand when using it.

When a `DataHandler` is mounted, that is when the `name` key in the shared data context is
initialized.

When a `DataHandler` is unmounted, the `name` key in the shared data context is **removed**
from the shared data context.

### `name` conflicts

If 2 different `DataHandler`s are the descendants of the same [`Provider`](provider.md) and
**also share the same `name` prop**, then there will be conflicts with that `name` key in
the shared data context.  Specifically, if one of the `DataHandler`s mounts after the other,
then the `name` key will be initialized by that `DataHandler` over what previously was set
by the first `DataHandler`.

Additionally, if one of the `DataHandler`s gets unmounted when the other is not, then the `name`
key and its value will be removed from the shared data context.
