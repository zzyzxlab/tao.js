# `@tao.js/routing-core`

Framework-agnostic **route entry → AppCon** contract for tao.js router adapters.

Host routers own URLs and layouts. This package owns:

- importing a TAO feature module (`initialize` + `load`) from a loader
- normalizing / applying loader signals onto a Kernel
- factories for React hooks that fire those signals (adapters inject React)

**Use an adapter in app code** unless you are building a new host:

| Adapter                     | Package                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| React Router (data routers) | [`@tao.js/routing-react-router`](../tao-routing-react-router/README.md) |
| TanStack Router             | [`@tao.js/routing-tanstack-router`](../tao-routing-tanstack/README.md)  |
| Next.js                     | [`@tao.js/routing-next`](../tao-routing-next/README.md)                 |

Legacy `@tao.js/router` is separate and unchanged.

## Install

```sh
pnpm add @tao.js/routing-core @tao.js/core
```

**Peer dependency:** `@tao.js/core` (`*`).

This package does **not** depend on React. Adapters inject `useEffect` / `useRef` / `useTaoContext` into the hook factories.

## Feature module contract

A dynamic-imported module should export:

| Export    | Role                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| `default` | `initialize(kernel)` — register handlers; may return a function (called immediately) |
| `load`    | Value or helpers passed to `loadSignal`                                              |

```js
import { AppCtx } from '@tao.js/core';

export default function initialize(TAO) {
  TAO.addInlineHandler({ t: 'Home', a: 'Enter', o: 'Portal' }, () => {
    return new AppCtx('Home', 'View', 'Portal');
  });
  return () => {
    TAO.setAppCtx(new AppCtx('Home', 'Init', 'Portal'));
  };
}

export const load = new AppCtx('Home', 'Enter', 'Portal');
```

## `createImportLoader(TAO, options?)`

Builds a host-router loader helper:

```js
import { createImportLoader } from '@tao.js/routing-core';

const loadHome = createImportLoader(TAO);
const result = await loadHome(import('./tao/home'));
// → { signal }  or  null when skipLoad
```

Signature of the returned function:

```text
async (modulePromise, ...args) => { signal } | null
```

| Option       | Default          | Meaning                                            |
| ------------ | ---------------- | -------------------------------------------------- |
| `loadSignal` | `(load) => load` | `(load, ...args) => signal`                        |
| `skipLoad`   | `false`          | After optional init, return `null` (no signal bag) |
| `skipInit`   | `false`          | Do not call `default` / `initialize`               |

Behavior:

1. `await` the module promise.
2. Unless `skipInit`: require `default` to be a function, call `initialize(TAO)`, and if the return value is a function, call it.
3. If `skipLoad`: return `null`.
4. Else: `signal = loadSignal(mod.load, ...args)` and return `{ signal }`.

Typical nested-route split (same module, different loaders):

```js
const base = createImportLoader(TAO, { skipLoad: true }); // init only
const list = createImportLoader(TAO, {
  skipInit: true,
  loadSignal: ({ fetchProducts }) => fetchProducts(),
});
const details = createImportLoader(TAO, {
  skipInit: true,
  loadSignal: ({ locateProduct }, params) => locateProduct(params),
});

await base(import('./tao/product'));
await list(import('./tao/product'));
await details(import('./tao/product'), { id: '42' });
```

## `applySignal(kernel, signal)` / `getSignal(loaderData)`

`getSignal` reads `loaderData.signal` (undefined if bag is nullish).

`applySignal` sets a context on the Kernel and returns whether it did:

| Signal shape                                         | Effect              | Return  |
| ---------------------------------------------------- | ------------------- | ------- |
| `AppCtx`                                             | `setAppCtx(signal)` | `true`  |
| non-empty `[tao, data?]`                             | `setCtx(...signal)` | `true`  |
| `{ tao, data? }` with truthy `tao`                   | `setCtx(tao, data)` | `true`  |
| `null` / `undefined` / `[]` / no `tao` / non-objects | no-op               | `false` |

```js
import { AppCtx } from '@tao.js/core';
import { applySignal, getSignal } from '@tao.js/routing-core';

applySignal(TAO, new AppCtx('Home', 'Enter', 'Portal'));
applySignal(TAO, [{ t: 'Home', a: 'Enter', o: 'Portal' }, { Home: {} }]);
applySignal(TAO, {
  tao: { t: 'Home', a: 'Enter', o: 'Portal' },
  data: { Home: {} },
});

const signal = getSignal(loaderData); // loaderData.signal
```

## Hook factories (for adapters)

These stay free of a React import. Adapters pass React + host hooks in:

```js
import {
  createUseSignalEffect,
  createUseRouteSignal,
} from '@tao.js/routing-core';

// From loader/route data API:
createUseSignalEffect({
  useEffect,
  useRef,
  useTaoContext,
  useSignal, // () => signal  (must call hooks)
});

// Explicit signal (e.g. Next props / RSC payload):
createUseRouteSignal({
  useEffect,
  useRef,
  useTaoContext,
});
```

Both apply via `applySignal` once per signal reference (ref guard for StrictMode double-invoke).

## Exports

```js
import {
  applySignal,
  getSignal,
  createImportLoader,
  createUseSignalEffect,
  createUseRouteSignal,
} from '@tao.js/routing-core';
```
