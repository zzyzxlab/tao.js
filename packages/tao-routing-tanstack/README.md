# `@tao.js/routing-tanstack-router`

TanStack Router adapter: **route loaders as TAO AppCon entry points**.

Host TanStack Router owns URLs and layouts. This package:

1. dynamic-imports a TAO feature module from a route `loader` (`importLoader`)
2. returns `{ signal }` as loader data
3. applies that signal to the Kernel on the client (`useLoaderSignal`)

Shared contract details live in [`@tao.js/routing-core`](../tao-routing-core/README.md). The React Router adapter ([`@tao.js/routing-react-router`](../tao-routing-react-router/README.md)) uses the same TAO contract; only the host route tree API differs.

## Install

```sh
pnpm add @tao.js/routing-tanstack-router @tao.js/routing-core @tao.js/core @tao.js/react react react-dom @tanstack/react-router
```

**Peer dependencies**

| Package                  | Constraint |
| ------------------------ | ---------- |
| `@tao.js/routing-core`   | `*`        |
| `@tao.js/core`           | `*`        |
| `@tao.js/react`          | `*`        |
| `react`                  | `>=16.8.0` |
| `@tanstack/react-router` | `>=1.0.0`  |

`useLoaderSignal` reads loader data via `@tanstack/react-router`’s `useLoaderData`. Define routes with `createRoute` / `createRouter` / `RouterProvider`.

## End-to-end happy path

### 1. Feature module (`initialize` + `load`)

A feature module is a normal ESM file. Default export registers handlers; named `load` is the route-entry value (or a bag of helpers).

```js
// src/tao/home.js
import { AppCtx } from '@tao.js/core';

const enterHome = new AppCtx('Home', 'Enter', 'Portal');
let initialized = false;

export default function initialize(TAO) {
  if (initialized) return;
  initialized = true;

  TAO.addInlineHandler({ t: 'Home', a: 'Enter', o: 'Portal' }, (tao, data) => {
    return new AppCtx('Home', 'View', 'Portal', data);
  });

  // Optional: return a function — importLoader calls it immediately after initialize.
  return () => {
    TAO.setAppCtx(new AppCtx('Home', 'Init', 'Portal'));
  };
}

export const load = enterHome;
```

Nested routes often share one module and export several load helpers:

```js
// src/tao/product.js
import { AppCtx } from '@tao.js/core';

let initialized = false;

export default function initialize(TAO) {
  if (initialized) return;
  initialized = true;

  TAO.addInlineHandler(
    { t: 'Product', a: 'Find', o: 'Portal' },
    (tao, data) => {
      // …fetch list…
      return new AppCtx('Product', 'Browse', 'Portal', {
        Product: { items: [] },
      });
    },
  );

  TAO.addInlineHandler(
    { t: 'Product', a: 'Select', o: 'Portal' },
    (tao, data) => {
      // …fetch one…
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

### 2. Kernel + Provider

Create (or reuse) a Kernel and wrap the tree with `@tao.js/react` `Provider` so `useLoaderSignal` / `RenderHandler` see the same network.

```js
// src/tao.js
import { Kernel } from '@tao.js/core';

export const TAO = new Kernel();
// or: import TAO from '@tao.js/core';
```

```jsx
// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from '@tao.js/react';
import { RouterProvider } from '@tanstack/react-router';
import { TAO } from './tao';
import { router } from './router';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider TAO={TAO}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
```

Pass the **same** Kernel into `importLoader(TAO, …)` when defining routes and into `<Provider TAO={TAO}>`.

### 3. Routes: `importLoader` + nested `skipInit` / `skipLoad` / `loadSignal`

TanStack routes are built with `createRootRoute` / `createRoute`, then composed into a `routeTree`. Put `importLoader` helpers on each route’s `loader` option. Path params use `$paramName` (e.g. `$id`), and the loader context exposes `params`.

```js
// src/router.js
import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { importLoader } from '@tao.js/routing-tanstack-router';
import { TAO } from './tao';
import { Layout } from './pages/Layout';
import { HomePage } from './pages/HomePage';
import { ProductListPage } from './pages/ProductListPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';

const homeLoader = importLoader(TAO);

// Parent: initialize the feature once; do not emit a load signal here.
const productBaseLoader = importLoader(TAO, { skipLoad: true });

// Children: module already initialized on the parent; pick a load helper + args.
const productListLoader = importLoader(TAO, {
  skipInit: true,
  loadSignal: ({ fetchProducts }) => fetchProducts(),
});

const productDetailsLoader = importLoader(TAO, {
  skipInit: true,
  loadSignal: ({ locateProduct }, params) => locateProduct(params),
});

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
  loader: (...args) => homeLoader(import('./tao/home'), ...args),
});

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'products',
  // initialize product handlers; return null (no signal)
  loader: () => productBaseLoader(import('./tao/product')),
});

const productsIndexRoute = createRoute({
  getParentRoute: () => productsRoute,
  path: '/',
  component: ProductListPage,
  loader: () => productListLoader(import('./tao/product')),
});

const productDetailsRoute = createRoute({
  getParentRoute: () => productsRoute,
  path: '$id',
  component: ProductDetailsPage,
  // extra loader args after the module promise are forwarded to loadSignal
  loader: ({ params }) => productDetailsLoader(import('./tao/product'), params),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  productsRoute.addChildren([productsIndexRoute, productDetailsRoute]),
]);

export const router = createRouter({ routeTree });
```

`importLoader(TAO, options)` returns an async helper:

```text
(modulePromise, ...args) => Promise<{ signal } | null>
```

| Option       | Default          | Meaning                                                                  |
| ------------ | ---------------- | ------------------------------------------------------------------------ |
| `skipInit`   | `false`          | Skip calling `default` export (`initialize`)                             |
| `skipLoad`   | `false`          | After init, return `null` (no `{ signal }`)                              |
| `loadSignal` | `(load) => load` | `(load, ...args) => signal` — map `mod.load` (+ loader args) to a signal |

When `skipInit` is false, `default` must be a function or the loader throws.

### 4. Page: `useLoaderSignal` + `RenderHandler`

Call `useLoaderSignal()` in the route component that should enter the TAO network. It reads `{ signal }` from TanStack’s `useLoaderData()` and applies it once per signal identity (StrictMode-safe).

```jsx
// src/pages/HomePage.jsx
import { RenderHandler } from '@tao.js/react';
import { useLoaderSignal } from '@tao.js/routing-tanstack-router';

export function HomePage() {
  useLoaderSignal();

  return (
    <RenderHandler t="Home" a="View" o="Portal">
      {(tao, data) => <h1>Home</h1>}
    </RenderHandler>
  );
}
```

```jsx
// src/pages/ProductDetailsPage.jsx
import { RenderHandler } from '@tao.js/react';
import { useLoaderSignal } from '@tao.js/routing-tanstack-router';

export function ProductDetailsPage() {
  useLoaderSignal();

  return (
    <RenderHandler t="Product" a="View" o="Portal">
      {(tao, data) => <h1>Product {data.Product?.id}</h1>}
    </RenderHandler>
  );
}
```

A layout route can just render an outlet (no `useLoaderSignal` required if it only runs `skipLoad` init):

```jsx
// src/pages/Layout.jsx
import { Outlet } from '@tanstack/react-router';

export function Layout() {
  return (
    <div>
      <nav>…</nav>
      <Outlet />
    </div>
  );
}
```

Flow:

```text
navigate → TanStack loader → importLoader → { signal }
  → render route component → useLoaderSignal → Kernel.setAppCtx / setCtx
  → handlers run → RenderHandler paints matching AppCon
```

## Accepted signal shapes

Whatever `loadSignal` returns (or `load` itself when using the default) must be one of:

| Shape                           | Applied as                 |
| ------------------------------- | -------------------------- |
| `AppCtx`                        | `kernel.setAppCtx(signal)` |
| `[tao, data?]` (non-empty)      | `kernel.setCtx(...signal)` |
| `{ tao, data? }` (`tao` truthy) | `kernel.setCtx(tao, data)` |

Examples:

```js
import { AppCtx } from '@tao.js/core';

// AppCtx
new AppCtx('Home', 'Enter', 'Portal');

// tuple
[{ t: 'Home', a: 'Enter', o: 'Portal' }, { Home: { id: '1' } }];

// object
{
  tao: { t: 'Home', a: 'Enter', o: 'Portal' },
  data: { Home: { id: '1' } },
}
```

`null` / `undefined` / empty array / object without `tao` → no Kernel update.

## Exports

```js
import {
  importLoader,
  useLoaderSignal,
  // also re-exported from @tao.js/routing-core:
  applySignal,
  getSignal,
  createImportLoader,
} from '@tao.js/routing-tanstack-router';
```

## Notes

- Prefer a dedicated `new Kernel()` per app (or tests) over relying on accidental global singleton sharing.
- Parent `skipLoad: true` + child `skipInit: true` is the usual pattern when several routes share one feature module.
- Path params are `$id` in the route `path` and `params.id` in the loader (not React Router’s `:id`).
- This package does not replace TanStack Router; it only bridges loader data into TAO.
- Typed route trees / `Register` module augmentation are optional TanStack features — they work the same; loader return type is `{ signal }` (or `null` when `skipLoad`).
