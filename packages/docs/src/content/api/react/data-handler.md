# DataHandler API

Package: `@tao.js/react`

Named Export

A React `Component` that _is a_ TAO handler listening for AppCons to use its handler function to
add and update data in the shared data context provided by its closest ancestor [`Provider`](provider.md).

## Properties

|name|req'd|type|default|description|
|---|---|---|---|
|`name`|yes|string||which key in the shared data context will be updated by the handler|
|`term`|no|string or string[]||defines a term or terms for the trigram the handler will subscribe|
|`action`|no|string or string[]||defines a action or actions for the trigram the handler will subscribe|
|`orient`|no|string or string[]||defines a orient(ation) or orient(ation)s for the trigram the handler will subscribe|
|`handler`|no|function|`(tao, data) => data`|a TAO handler function with special behaviors affecting how data is handled|
|`default`|no|object||`Object` value used to initialize the state of the `name` key in the shared data context|
|||function||a no arg `Function` that will be called returning an `Object` used to initialize the `name` key in the shared data context|

### `handler` function prop

The `handler` prop expects a function that will receive the following args:

* `tao` - trigram of the AppCon set on the TAO that is what triggered the call to the handler
* `data` - data associated with the AppCon when it was set on the TAO
* `set` - a one arg function that _can be used_ to set the value of the `name` key in the shared data
  context
* `current` - the current value of the `name` key in the shared data context

#### `handler` function prop behaviors

Unlike a standard TAO Inline Handler function where all return values that are not an
instance of an `AppCtx` used for [chaining](../../basics/chaining.md) are ignored, the
`DataHandler`'s handler function is used to set the value of the `name` key in the shared data
context, and so provides the following behaviors:

* if the `set` function passed to the handler is called, that will completely set (overwriting
  existing values) the value of the `name` key in the shared data context to the value passed to
  `set`
* if the `set` function **is not called** and the return value is **not** an instance of `AppCtx`
  from `@tao.js/core`, then the value will be shallow merged with the existing value for the `name`
  key in the shared data context
* if the return value from the handler function is an instance of `AppCtx` from `@tao.js/core`,
  it will be returned to the TAO and used to set the context on the TAO as an [AppCon chain](../basics/chaining.md)
  * _*this can be used in conjunction with the `set` function passed to the handler_
* if the `set` function is not called and the handler does not return a value, then nothing will
  happen

If **not** provided as a prop to a `DataHandler`, the default will be a handler that receives the TAO
AppCon `(tao, data)` [trigram and data] and return the `data` arg without manipulation, serving the
second behavior outlined above.

## Children

_**Children are required**_

Children can be any valid child of a React `Component` (so anything).

Descendant [`RenderHandler`s](render-handler.md) can gain access to the data the `DataHandler` is
updating in the shared data context from the [`Provider`](provider.md) by using the `DataHandler`'s
`name` key in the [`context` prop of the `RenderHandler`]().

## Example

A simple example of a `DataHandler` being used to set the User in the shared data context with a
`user` key:

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

More complex example of a `DataHandler` being used to the Roles for a User in the shared data
constext with a `roles` key:

```javascript
<DataHandler
  name="roles"
  term={['User', 'Role']}
  action={['Enter', 'Leave']}
  orient="Portal"
  default={new Set()}
  handler={(tao, data, set, current) => {
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
  }}
>
  {/* consumption by children and descendants */}
  …
</DataHandler>
```
