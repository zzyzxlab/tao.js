# `@tao.js/routing-react-router`

React Router adapter: **route loaders as TAO AppCon entry points**.

Host React Router owns URLs and layouts. This package:

1. dynamic-imports a TAO feature module from a route `loader` (`importLoader`)
2. returns `{ signal }` as loader data
3. applies that signal to the Kernel on the client (`useLoaderSignal`)

Shared contract details live in [`@tao.js/routing-core`](../tao-routing-core/README.md).

## Install

```sh
pnpm add @tao.js/routing-react-router @tao.js/routing-core @tao.js/core @tao.js/react react react-router react-dom
# browser apps also typically need:
pnpm add react-router-dom
```

**Peer dependencies**

| Package                | Constraint                         |
| ---------------------- | ---------------------------------- |
| `@tao.js/routing-core` | `*`                                |
| `@tao.js/core`         | `*`                                |
| `@tao.js/react`        | `*`                                |
| `react`                | `>=16.8.0`                         |
| `react-router`         | `>=6.4.0` (data routers / loaders) |

`useLoaderSignal` reads loader data via `react-router`’s `useLoaderData`. Use a data router (`createBrowserRouter` / `RouterProvider`).

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
import { RouterProvider } from 'react-router';
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

```js
// src/router.js
import { createBrowserRouter } from 'react-router';
import { importLoader } from '@tao.js/routing-react-router';
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
        loader: (...args) => homeLoader(import('./tao/home'), ...args),
      },
      {
        path: 'products',
        // initialize product handlers; return null (no signal)
        loader: () => productBaseLoader(import('./tao/product')),
        children: [
          {
            index: true,
            element: <ProductListPage />,
            loader: () => productListLoader(import('./tao/product')),
          },
          {
            path: ':id',
            element: <ProductDetailsPage />,
            // extra loader args after the module promise are forwarded to loadSignal
            loader: ({ params }) =>
              productDetailsLoader(import('./tao/product'), params),
          },
        ],
      },
    ],
  },
]);
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

Call `useLoaderSignal()` in the route element that should enter the TAO network. It reads `{ signal }` from `useLoaderData()` and applies it once per signal identity (StrictMode-safe).

```jsx
// src/pages/HomePage.jsx
import { RenderHandler } from '@tao.js/react';
import { useLoaderSignal } from '@tao.js/routing-react-router';

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
import { useLoaderSignal } from '@tao.js/routing-react-router';

export function ProductDetailsPage() {
  useLoaderSignal();

  return (
    <RenderHandler t="Product" a="View" o="Portal">
      {(tao, data) => <h1>Product {data.Product?.id}</h1>}
    </RenderHandler>
  );
}
```

Flow:

```text
navigate → React Router loader → importLoader → { signal }
  → render route element → useLoaderSignal → Kernel.setAppCtx / setCtx
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
} from '@tao.js/routing-react-router';
```

## Notes

- Prefer a dedicated `new Kernel()` per app (or tests) over relying on accidental global singleton sharing.
- Parent `skipLoad: true` + child `skipInit: true` is the usual pattern when several routes share one feature module.
- This package does not replace React Router; it only bridges loader data into TAO.
