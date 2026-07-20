# `@tao.js/routing-core`

Framework-agnostic **route entry → AppCon** contract for tao.js.

Host routers (React Router, TanStack Router, Next.js, …) own URLs, layouts, and **when code loads**. This package owns the TAO side of that handshake: feature modules, loader helpers, and applying a route-entry signal onto a Kernel.

**App code should use an adapter.** This package is the shared philosophy + API those adapters implement.

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

This package does **not** depend on React. Hook factories take `useEffect` / `useRef` / `useTaoContext` as injections so adapters can wire host data APIs without pulling React into core.

---

## Philosophy: feature modules + host loaders

### The split of responsibilities

| Layer              | Owns                                                     | Does not own                          |
| ------------------ | -------------------------------------------------------- | ------------------------------------- |
| **Host router**    | URL, nested layouts, lazy pages, **loaders / data APIs** | Business event semantics              |
| **TAO Kernel**     | AppCons, handlers, chaining Settle → View                | Pathnames, history, file-based routes |
| **Feature module** | Handlers for a domain slice + how to _enter_ that slice  | Which URL maps to which page shell    |

Popular routers already solved **code splitting** and (where applicable) **SSR data loading** via loaders / server components. Fighting that with a second TAO-native router is usually worse DX. Instead:

1. The host decides _this navigation needs the Product feature_ (route match → loader / RSC).
2. The loader **dynamic-imports** a TAO feature module (bundle split lands here).
3. The module **`initialize`s** handlers on the Kernel (once per heap) and exposes a **`load`** entry that becomes an AppCon signal.
4. The client (or server) **applies** that signal; handlers settle; `@tao.js/react` `RenderHandler` / data hooks paint.

```text
URL / navigation
  → host loader (or RSC / getServerSideProps)
      → import('./tao/product')     ← code split boundary
      → initialize(TAO)             ← register handlers
      → { signal } from load        ← route entry AppCon
  → apply signal on Kernel
  → handlers chain
  → RenderHandler matches View AppCon
```

### Why feature modules matter

A **feature module** is the unit you split and enter:

- **Code splitting** — `import('./tao/product')` inside a host loader only downloads Product handlers when that route is hit (or prefetched), not on first paint of the whole app.
- **SSR / server loaders** — the same module can run in a server loader or RSC: `initialize` against a server Kernel if needed, and produce a signal (prefer serializable shapes) for the client.
- **Nested routes** — a parent route can `skipLoad` (init only); children `skipInit` and pick different `load` helpers (`fetchProducts` vs `locateProduct(params)`). One module, several entries — matches how host routers nest layouts.
- **Testability** — features are plain ESM (`initialize` + `load`); no router types required to unit-test handlers.

### What “enter” means

Entering a route in this model is not “mount a React page.” It is **setting an Application Context** on the Kernel (`setAppCtx` / `setCtx`) so intercept → async → inline handlers run. The page shell is still the host’s; readiness and data for that shell come from TAO signals (`RenderHandler`, `useTaoData`, etc.).

### Adapter role

Adapters only answer: _how does this host deliver `{ signal }` (or an explicit signal) into `applySignal`?_

- React Router / TanStack: loader returns `{ signal }` → `useLoaderSignal()` reads host `useLoaderData`.
- Next: no universal loader-data bridge → pass a serializable signal as props → `useRouteSignal(signal)`; optional `enterRoute` on a server Kernel.

Everything below is the shared contract. Adapter READMEs show the host wiring only.

---

## Feature module contract

> **Define feature modules first.** Adapters assume this shape.

| Export    | Role                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| `default` | `initialize(TAO)` — register handlers on the Kernel you pass in (guard for idempotency) |
| `load`    | Route-entry value **or** a bag of helpers that produce a signal                         |

Optional: `initialize` may return a function; `createImportLoader` calls it immediately after `initialize` (handy for a one-shot init AppCon).

### Minimal feature

```js
// tao/home.js
import { AppCtx } from '@tao.js/core';

let initialized = false;

export default function initialize(TAO) {
  if (initialized) return;
  initialized = true;

  TAO.addInlineHandler({ t: 'Home', a: 'Enter', o: 'Portal' }, (tao, data) => {
    return new AppCtx('Home', 'View', 'Portal', data);
  });
}

export const load = new AppCtx('Home', 'Enter', 'Portal');
// Or serializable (required if the signal crosses an RSC / SSR props boundary):
// export const load = { tao: { t: 'Home', a: 'Enter', o: 'Portal' }, data: {} };
```

### Shared feature with several load helpers (nested routes)

```js
// tao/product.js
import { AppCtx } from '@tao.js/core';

let initialized = false;

export default function initialize(TAO) {
  if (initialized) return;
  initialized = true;

  TAO.addInlineHandler({ t: 'Product', a: 'Find', o: 'Portal' }, () => {
    return new AppCtx('Product', 'Browse', 'Portal', {
      Product: { items: [] },
    });
  });

  TAO.addInlineHandler(
    { t: 'Product', a: 'Select', o: 'Portal' },
    (tao, data) => {
      return new AppCtx('Product', 'View', 'Portal', {
        Product: { id: data.Select?.id },
      });
    },
  );
}

export function fetchProducts() {
  return new AppCtx('Product', 'Find', 'Portal');
}

export function locateProduct({ id }) {
  return new AppCtx('Product', 'Select', 'Portal', { Select: { id } });
}

export const load = { fetchProducts, locateProduct };
```

---

## `createImportLoader(TAO, options?)`

Builds the helper hosts call from loaders / RSC / data functions:

```js
import { createImportLoader } from '@tao.js/routing-core';

const loadHome = createImportLoader(TAO);
const result = await loadHome(import('./tao/home'));
// → { signal }  or  null when skipLoad
```

```text
async (modulePromise, ...args) => { signal } | null
```

| Option       | Default          | Meaning                                                                 |
| ------------ | ---------------- | ----------------------------------------------------------------------- |
| `skipInit`   | `false`          | Skip calling `default` (`initialize`)                                   |
| `skipLoad`   | `false`          | After init, return `null` (no `{ signal }`)                             |
| `loadSignal` | `(load) => load` | `(load, ...args) => signal` — map `mod.load` (+ extra args) to a signal |

Behavior:

1. `await` the module promise (this is the code-split boundary).
2. Unless `skipInit`: require `default` to be a function, call `initialize(TAO)`, and if it returns a function, call that.
3. If `skipLoad`: return `null`.
4. Else: `signal = loadSignal(mod.load, ...args)` and return `{ signal }`.

### Nested init vs enter (same module)

```js
const base = createImportLoader(TAO, { skipLoad: true }); // parent: init only
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

Adapters expose this as `importLoader` (same function).

---

## Accepted signal shapes

Whatever `load` / `loadSignal` returns is applied with `applySignal`:

| Shape                           | Applied as                 |
| ------------------------------- | -------------------------- |
| `AppCtx`                        | `kernel.setAppCtx(signal)` |
| `[tao, data?]` (non-empty)      | `kernel.setCtx(...signal)` |
| `{ tao, data? }` (`tao` truthy) | `kernel.setCtx(tao, data)` |

`null` / `undefined` / `[]` / object without truthy `tao` → no Kernel update (`applySignal` returns `false`).

```js
import { AppCtx } from '@tao.js/core';
import { applySignal, getSignal } from '@tao.js/routing-core';

applySignal(TAO, new AppCtx('Home', 'Enter', 'Portal'));
applySignal(TAO, [{ t: 'Home', a: 'Enter', o: 'Portal' }, { Home: {} }]);
applySignal(TAO, {
  tao: { t: 'Home', a: 'Enter', o: 'Portal' },
  data: { Home: {} },
});

const signal = getSignal(loaderData); // loaderData?.signal
```

**SSR / RSC:** prefer `{ tao, data }` or `[tao, data]` when the signal must cross a serialization boundary. Live `AppCtx` instances do not round-trip as props.

---

## Kernel, TaoProvider, and UI

- Prefer a dedicated `new Kernel()` for the interactive app (and a separate one in tests).
- Wrap the React tree that uses handlers/hooks in `@tao.js/react` `<TaoProvider TAO={TAO}>`.
- Pass the **same** Kernel into `createImportLoader` / `importLoader` that the UI `TaoProvider` uses (on that heap).
- After the signal is applied, paint with `RenderHandler` (or data hooks) matching the View AppCon your handlers emit — not the Enter/Find alone, unless you intentionally render on those.

Server heaps (RSC, `getServerSideProps`) are **not** the browser Kernel. Initializing or `enterRoute`-ing on the server does not register handlers on the client; see the Next adapter for the dual-Kernel recipe.

---

## Hook factories (for adapter authors)

```js
import {
  createUseSignalEffect,
  createUseRouteSignal,
} from '@tao.js/routing-core';

// Host exposes signal via useLoaderData (or similar):
createUseSignalEffect({
  useEffect,
  useRef,
  useTaoContext,
  useSignal, // () => signal — must call hooks
});

// Explicit signal (props / page data):
createUseRouteSignal({
  useEffect,
  useRef,
  useTaoContext,
});
```

Both call `applySignal` once per signal **reference** (StrictMode-safe). When navigation changes the logical entry, pass a new signal object.

---

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

## Next step

Pick an adapter and wire the host loader / RSC path — feature modules and signal rules stay as documented here.
