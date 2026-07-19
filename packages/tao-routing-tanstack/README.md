# `@tao.js/routing-tanstack-router`

TanStack Router adapter: **route loaders as TAO AppCon entry points**.

Same contract as [`@tao.js/routing-react-router`](../tao-routing-react-router/README.md) — feature modules, `importLoader` options, signal shapes, and `useLoaderSignal` → Kernel → `RenderHandler`. Differences below are TanStack-only.

Shared helpers: [`@tao.js/routing-core`](../tao-routing-core/README.md).

## Install

```sh
pnpm add @tao.js/routing-tanstack-router @tao.js/routing-core @tao.js/core @tao.js/react react @tanstack/react-router
```

**Peer dependencies**

| Package                  | Constraint |
| ------------------------ | ---------- |
| `@tao.js/routing-core`   | `*`        |
| `@tao.js/core`           | `*`        |
| `@tao.js/react`          | `*`        |
| `react`                  | `>=16.8.0` |
| `@tanstack/react-router` | `>=1.0.0`  |

## What differs from React Router

| Concern            | React Router                                         | TanStack Router                                                |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------- |
| Loader helper      | `importLoader` (same API)                            | same                                                           |
| Where loader lives | `route.loader`                                       | `loader` on `createRoute` / route options                      |
| Client hook        | `useLoaderSignal` via `react-router` `useLoaderData` | `useLoaderSignal` via `@tanstack/react-router` `useLoaderData` |
| Return shape       | `{ signal }` (or `null` if `skipLoad`)               | same                                                           |

Feature module shape, `skipInit` / `skipLoad` / `loadSignal`, and accepted signals (`AppCtx` \| `[tao, data?]` \| `{ tao, data? }`) are identical — see the [React Router README](../tao-routing-react-router/README.md) for the full walkthrough.

## Minimal wiring

```js
// src/tao/home.js — same initialize + load as React Router guide
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

```js
// src/router.js
import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { importLoader } from '@tao.js/routing-tanstack-router';
import { TAO } from './tao';
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

const rootRoute = createRootRoute();

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

```jsx
// src/pages/HomePage.jsx — same pattern as React Router
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
