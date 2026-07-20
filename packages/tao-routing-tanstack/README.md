# `@tao.js/routing-tanstack-router`

TanStack Router adapter for the [`@tao.js/routing-core`](../tao-routing-core/README.md) contract: **route `loader`s** as TAO feature entry points.

**Read routing-core first** for philosophy (feature modules, code splitting, nested `skipInit` / `skipLoad`), signal shapes, and `createImportLoader` options. This README only shows how to apply that contract with TanStack Router.

## What this adapter does

| Step | TanStack Router API                     | This package                          |
| ---- | --------------------------------------- | ------------------------------------- |
| 1    | Route `loader` on `createRoute`         | `importLoader(TAO)` inside the loader |
| 2    | Loader data is `{ signal }` (or `null`) | same bag as core                      |
| 3    | Route `component` mounts                | `useLoaderSignal()` → Kernel          |
| 4    | UI                                      | `@tao.js/react` `RenderHandler` etc.  |

`useLoaderSignal` is `createUseSignalEffect` wired to `@tanstack/react-router`’s `useLoaderData` + `@tao.js/react`’s `useTaoContext`.

## Install

```sh
pnpm add @tao.js/routing-tanstack-router @tao.js/routing-core @tao.js/core @tao.js/react react react-dom @tanstack/react-router
```

| Peer                     | Constraint |
| ------------------------ | ---------- |
| `@tao.js/routing-core`   | `*`        |
| `@tao.js/core`           | `*`        |
| `@tao.js/react`          | `*`        |
| `react`                  | `>=16.8.0` |
| `@tanstack/react-router` | `>=1.0.0`  |

## Implement the philosophy with TanStack Router

### 1. Feature modules

Author `tao/*.js` as in [routing-core — Feature module contract](../tao-routing-core/README.md#feature-module-contract).

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

### 3. Put `importLoader` on `createRoute({ loader })`

Code-split boundary = `import('./tao/…')` inside the loader. Path params use `$id` (not `:id`); the loader context exposes `params`.

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
const productBaseLoader = importLoader(TAO, { skipLoad: true });
const productListLoader = importLoader(TAO, {
  skipInit: true,
  loadSignal: ({ fetchProducts }) => fetchProducts(),
});
const productDetailsLoader = importLoader(TAO, {
  skipInit: true,
  loadSignal: ({ locateProduct }, params) => locateProduct(params),
});

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
  loader: (...args) => homeLoader(import('./tao/home'), ...args),
});

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'products',
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
  loader: ({ params }) => productDetailsLoader(import('./tao/product'), params),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  productsRoute.addChildren([productsIndexRoute, productDetailsRoute]),
]);

export const router = createRouter({ routeTree });
```

Options: [routing-core](../tao-routing-core/README.md#createimportloadertao-options).

### 4. Enter TAO in the route component

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

Layout can be a plain outlet (parent may only `skipLoad` init):

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

```text
navigate → TanStack loader → importLoader → { signal }
  → component render → useLoaderSignal → Kernel → RenderHandler
```

Typed route trees / `Register` work as usual; loader return type is `{ signal }` or `null`.

## Exports

```js
import {
  importLoader,
  useLoaderSignal,
  applySignal,
  getSignal,
  createImportLoader,
} from '@tao.js/routing-tanstack-router';
```
