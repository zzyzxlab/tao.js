# `@tao.js/react` hooks

Since [React 16.8](https://reactjs.org/docs/hooks-intro.html), _Hooks_ are a new way to work
with React to build functional components. This is not a guide to learn React Hooks. If you
are totally new to React Hooks then you may want to check out their [Guides here](https://reactjs.org/docs/hooks-overview.html).

Building with React Hooks allows you to take advantage of using function components, aka
React Components that are pure functions and don't rely on instantiating a `class` that `inherits`
from `React.Component`.

This has many advantages I don't need to elicit here, but it is a preferred way to develop modern
React applications so we want to ensure we support this style of development in the `@tao.js/react`
package.

There are a few hooks available in the package, and they're all exported directly by name:

* [`useTaoContext`](#usetaocontext) makes it easy to import the TAO Network into your component
* [`useTaoInlineHandler`](#usetaoinlinehandler) makes it possible to use a hook to add
an `InlineHandler` with specific dependencies to your component
* [`useTaoAsyncHandler`](#usetaoasynchandler) makes it possible to use a hook to add
an `AsyncHandler` with specific dependencies to your component
* [`useTaoInterceptHandler`](#usetaointercepthandler) makes it possible to use a hook to add
an `IntercepteHandler` with specific dependencies to your component
* [`useTaoDataContext`](#usetaodatacontext) makes it possible to use a hook to import data
into your component from a TAO DataContext provided by a [`DataHandler`](data-handler.md)
component higher up in your component hierarchy

All hooks require that a [`Provider`](provider.md) is somehwere in the ancestry of the component you are using
the hook within.

## `useTaoContext`

### importing `useTaoContext`

`useTaoContext` is a named export from the `@tao.js/react` package.

```javascript
import { useTaoContext } from '@tao.js/react';
```

OR

```javascript
const useTaoContext = require('@tao.js/react').useTaoContext;
```

### using `useTaoContext`

This is a hook that allows you to import and use the TAO Network provided by the [Provider](provider.md)
that wraps your component within your React Component. Underneath it's using the `useContext`
hook to fetch the `TAO` included by the [Provider](provider.md) which is not likely to
change unless your app changes it.

Use the TAO you get back to add handlers or more than likely to `setCtx` or `setAppCtx` to
send a signal into the network.

```javascript
function MyComponent(props) {
  const TAO = useTaoContext();

  return (
    <div>
      <a onClick={() => TAO.setCtx({ t: 'home', a: 'enter', o: 'app' })}>
        Go Home
      </a>
    </div>
  )
}
```

## `useTaoInlineHandler`

### importing `useTaoInlineHandler`

`useTaoInlineHandler` is a named export from the `@tao.js/react` package.

```javascript
import { useTaoInlineHandler } from '@tao.js/react';
```

OR

```javascript
const useTaoInlineHandler = require('@tao.js/react').useTaoInlineHandler;
```

### using `useTaoInlineHandler`

Simply put, this is a hook that allows you to add an InlineHandler to the TAO network
provided by the [Provider](provider.md) that wraps your component within your React
Component. The hook will add the provided handler to the TAO Network for the provided trigram
and automatically remove the handler when the component unmounts.

The handler will be added after the first render and be removed whenever the render reruns
due to a change in the component and readd the handler.

To only remove and readd the handler upon the change of specific variables, you can provide the
`dependencies` as you would for the built-in `useEffect` hook on which this hook is based.

```javascript
function MyComponent(props) {
  const [count, setCount] = useState(0);

  const TAO = useTaoContext();

  // handler is removed and readded on next render to get latest value of count
  useTaoInlineHandler({ t: 'count', a: ['add', 'subtract'], o: 'app' }, (tao, data) => {
    const newCount = tao.a === 'add' ? count + 1 : count - 1;
    setCount(newCount);
  });

  return (
    <div>
      <p>Your count is: {count}</p>
      <button onClick={() => TAO.setCtx({ t: 'count', a: 'add', o: 'app' })}>
        Up
      </button>
      <button onClick={() => TAO.setCtx({ t: 'count', a: 'subtract', o: 'app' })}>
        Down
      </button>
    </div>
  );
}
```

## `useTaoAsyncHandler`

### importing `useTaoAsyncHandler`

`useTaoAsyncHandler` is a named export from the `@tao.js/react` package.

```javascript
import { useTaoAsyncHandler } from '@tao.js/react';
```

OR

```javascript
const useTaoAsyncHandler = require('@tao.js/react').useTaoAsyncHandler;
```

### using `useTaoAsyncHandler`

Acts exactly the same as [`useTaoInlineHandler`](#usetaoinlinehandler) except it is adding an
AsyncHandler to the provided network.

## `useTaoInterceptHandler`

### importing `useTaoInterceptHandler`

`useTaoInterceptHandler` is a named export from the `@tao.js/react` package.

```javascript
import { useTaoInterceptHandler } from '@tao.js/react';
```

OR

```javascript
const useTaoInterceptHandler = require('@tao.js/react').useTaoInterceptHandler;
```

### using `useTaoInterceptHandler`

Acts exactly the same as [`useTaoInlineHandler`](#usetaoinlinehandler) except it is adding an
AsyncHandler to the provided network.

## `useTaoDataContext`

### importing `useTaoDataContext`

`useTaoDataContext` is a named export from the `@tao.js/react` package.

```javascript
import { useTaoDataContext } from '@tao.js/react';
```

OR

```javascript
const useTaoDataContext = require('@tao.js/react').useTaoDataContext;
```

### using `useTaoDataContext`

Unlike the other hooks from this library, this hook is used to get access to a DataContext
created in a parent component using a DataHandler. Similar to how a RenderHandler can name
a DataContext to include in its handler, this hook will provide access to the data in a
named DataContext and provide an update when the data changes.

```javascript
function MyComponent(props) {
  // name provided to useTaoDataContext matches name prop of parent DataHandler
  const user = useTaoDataContext('user');

  // updates to user will cause a rerender
  if (!user) {
    return <span>Hello. Please <a href="…">Login</a> to join the fun</span>;
  }
  return (
    <span>Hello, {user.firstName} {user.lastName} ({user.username})</span>
  );
}

// would normally be in separate file
function WrappingComponent(props) {
  return (
    <DataHandler
      name="user"
      term={['user', 'role']}
      action={['enter', 'leave']}
      orient="app"
      handler={(tao, data, set, current) => {
        …
      }}
    >
      <MyComponent />
    </DataHandler>
  );
}
```
