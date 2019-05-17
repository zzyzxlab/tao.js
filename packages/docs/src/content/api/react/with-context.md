# withContext API

**Package:** `@tao.js/react`

**Named Export:** `withContext`

A React [Higher-Order Component (HOC)](https://reactjs.org/docs/higher-order-components.html) used to
wrap a standard React `Component` with a handler so that it can subscribe to data from AppCons.

## HOC Function Args

|name|required|type|default|description|
|---|---|---|---|---|
|`tao`|no|`Object`||a standard trigram as would be passed when defining a handler directly on the TAO. Not providing a trigram will result in the universal wildcard trigram.|
|`handler`|yes|function||similar to a standard TAO handler with the same signature, the return value will be used to set the `data` prop of the wrapped `Component`|
|`default`|no|function or `Object`|`undefined`|what to set the `data` prop of the wrapped `Component` before any AppCons matching a trigram of the `tao` arg has been encountered|

## Children

As with all other HOCs, the wrapped `Component` is the child of the `withContext` component.

## `handler` function

Similar to a standard handler for the TAO, this handler is called when a matching AppCon is set on
the TAO and receives as arguments the trigram and data of the AppCon when it is triggered.

Unlike a TAO handler, the `withContext` HOC `handler` function is used to set the `data` prop of the
wrapped `Component` when it is called.

### `handler` function args

|name|type|description|
|---|---|---|
|`tao`|trigram|the trigram of the AppCon set on the TAO that triggered the handler|
|`data`|Object|the data associated with the AppCon set on the TAO that triggered the handler|
|`set`|function|a function used to completely set the value of the `data` prop passed to the wrapped `Component`|
|`current`|Object|the value of the `data` prop for the wrapped `Component` as it currently exists/is defined when the handler is triggered|

### How the `data` prop is set

The `data` prop of the wrapped `Component` can be set by the `handler` using 2 methods:

1. the return value of the `handler` function is merged with the existing value
2. the value passed to the `set` function (3rd arg to the `handler`) within the `handler` function

To ensure deterministic behavior, if the `set` function is called, the return value of the `handler`
function will **not be merged** with the existing value.

### Chaining

The `handler` function of the `withContext` HOC has the ability as any other hander to chain to
another AppCon by returning an `AppCon` from the function.

If an AppCon is returned from the `handler` function, it **will not be merged** with the existing
value of the `data` prop.

To chain using an AppCon as well as change the value of the `data` prop of the wrapped
`Component`, use the `set` function (3rd arg to `handler`) before returning the next chained AppCon.

### Special Note to avoid unnecessary React renders

If neither the `handler` returns a value nor the `set` arg to the `handler` function is called, this
will instruct the HOC that no change has occurred as a result of the AppCon being set on the TAO in
which case the HOC will not trigger a render.

## Examples

### Basic Example

```javascript
const UserHOC = withContext(
  // first arg is a tao trigram
  { t: 'User', a: 'Enter', o: 'Portal' },
  // second arg is a handler function
  (tao, data) => ({ user: data.User }),
  …
);

export default UserHOC(UserView);
```

### Leveraging the Merging of returned data

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

export default UserHOC(UserView);
```

### Using `set` function

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

export default RolesHOC(PortalView);
```

### Modifying `data` prop AND chaining

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

export default RolesHOC(PortalView);
```
