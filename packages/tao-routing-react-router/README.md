# `@tao.js/routing-react-router`

React Router adapter for the [`@tao.js/routing-core`](../tao-routing-core/README.md) contract: **data-router loaders** as TAO feature entry points.

**Read routing-core first** for philosophy (feature modules, code splitting, nested `skipInit` / `skipLoad`), signal shapes, and `createImportLoader` options. This README only shows how to apply that contract with React Router.

## What this adapter does

| Step | React Router API                        | This package                          |
| ---- | --------------------------------------- | ------------------------------------- |
| 1    | Route `loader` runs on navigation       | `importLoader(TAO)` inside the loader |
| 2    | Loader data is `{ signal }` (or `null`) | same bag as core                      |
| 3    | Route element mounts                    | `useLoaderSignal()` → Kernel          |
| 4    | UI                                      | `@tao.js/react` `RenderHandler` etc.  |

`useLoaderSignal` is `createUseSignalEffect` wired to `react-router`’s `useLoaderData` + `@tao.js/react`’s `useTaoContext`.

## Install

```sh
pnpm add @tao.js/routing-react-router @tao.js/routing-core @tao.js/core @tao.js/react react react-router react-dom
# often also:
pnpm add react-router-dom
```

| Peer                   | Constraint                         |
| ---------------------- | ---------------------------------- |
| `@tao.js/routing-core` | `*`                                |
| `@tao.js/core`         | `*`                                |
| `@tao.js/react`        | `*`                                |
| `react`                | `>=16.8.0`                         |
| `react-router`         | `>=6.4.0` (data routers / loaders) |

Use `createBrowserRouter` / `RouterProvider` (or another data router).

## Implement the philosophy with React Router

### 1. Feature modules

Author `tao/*.js` as in [routing-core — Feature module contract](../tao-routing-core/README.md#feature-module-contract). No React Router types required.

### 2. Shared Kernel + Provider

```js
// src/tao.js
import { Kernel } from '@tao.js/core';
export const TAO = new Kernel();
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

Pass this same `TAO` into every `importLoader(TAO, …)`.

### 3. Put `importLoader` on route `loader`s

Code-split boundary = `import('./tao/…')` inside the loader (React Router already defers loader work until the route matches / prefetches).

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

// Parent: initialize Product feature once; no enter signal.
const productBaseLoader = importLoader(TAO, { skipLoad: true });

// Children: skipInit; choose load helper (+ params).
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
            loader: ({ params }) =>
              productDetailsLoader(import('./tao/product'), params),
          },
        ],
      },
    ],
  },
]);
```

Options (`skipInit`, `skipLoad`, `loadSignal`): [routing-core](../tao-routing-core/README.md#createimportloadertao-options).

### 4. Enter TAO in the route element

```jsx
// src/pages/ProductDetailsPage.jsx
import { RenderHandler } from '@tao.js/react';
import { useLoaderSignal } from '@tao.js/routing-react-router';

export function ProductDetailsPage() {
  useLoaderSignal(); // reads useLoaderData().signal → applySignal(TAO, signal)

  return (
    <RenderHandler t="Product" a="View" o="Portal">
      {(tao, data) => <h1>Product {data.Product?.id}</h1>}
    </RenderHandler>
  );
}
```

```text
navigate → RR loader → importLoader → { signal }
  → element render → useLoaderSignal → Kernel → RenderHandler
```

SSR with React Router frameworks (Remix, RR7 SSR): same loader → `{ signal }` idea; prefer serializable signal shapes if the payload crosses a server/client boundary ([routing-core](../tao-routing-core/README.md#accepted-signal-shapes)).

## Exports

```js
import {
  importLoader,
  useLoaderSignal,
  applySignal,
  getSignal,
  createImportLoader,
} from '@tao.js/routing-react-router';
```
