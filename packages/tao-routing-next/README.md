# `@tao.js/routing-next`

Next.js adapter for the [`@tao.js/routing-core`](../tao-routing-core/README.md) contract: **route-entry signals** into a TAO Kernel when there is no universal `useLoaderData` bridge.

**Read routing-core first** for philosophy (feature modules, code splitting via dynamic `import()`, nested `skipInit` / `skipLoad`), signal shapes, and `createImportLoader` options. This README only shows how to apply that contract with Next (App Router and a short Pages note).

## What this adapter does

Next splits server and client heaps. The adapter mirrors that:

| Surface                       | API                                                  |
| ----------------------------- | ---------------------------------------------------- |
| Server / RSC / route handlers | `enterRoute(kernel, signal)` and/or `importLoader`   |
| Client components             | `useRouteSignal(signal)` with an **explicit** signal |

Unlike React Router / TanStack, you must **pass** the signal (usually as serializable props). `useRouteSignal` is `createUseRouteSignal` from core; `enterRoute` is `applySignal`.

## Install

```sh
pnpm add @tao.js/routing-next @tao.js/routing-core @tao.js/core @tao.js/react react react-dom next
```

**Peers:** `@tao.js/routing-core`, `@tao.js/core`, `@tao.js/react`, `react` (`>=16.8`); `next` (`>=13`, optional).

## Implement the philosophy with Next

### 1. Feature modules

Author `tao/*.js` as in [routing-core — Feature module contract](../tao-routing-core/README.md#feature-module-contract).

For anything that crosses RSC → client props, export **serializable** `load` / helpers (`{ tao, data }` or `[tao, data]`), not live `AppCtx` instances.

### 2. Mental model (Next-specific)

| Heap    | Kernel                         | Typical use                                       |
| ------- | ------------------------------ | ------------------------------------------------- |
| Server  | Optional `new Kernel()` in RSC | `importLoader` + optional `enterRoute` for SSR    |
| Browser | One Kernel in client Provider  | `initialize` + `useRouteSignal` + `RenderHandler` |

Initializing on the server does **not** install handlers on the client. Interactive UI almost always needs client `initialize` (e.g. `importLoader(clientTAO, { skipLoad: true })` in a client layout/effect).

Code splitting still comes from `import('./tao/…')` inside the server page / layout / `getServerSideProps` — Next’s async Server Components and data APIs are the host “loader.”

### 3. Client Kernel + root Provider

```js
// lib/tao-client.js
'use client';
import { Kernel } from '@tao.js/core';
export const TAO = new Kernel();
```

```jsx
// app/providers.jsx
'use client';
import { Provider } from '@tao.js/react';
import { TAO } from '../lib/tao-client';

export function AppProviders({ children }) {
  return <Provider TAO={TAO}>{children}</Provider>;
}
```

```jsx
// app/layout.jsx
import { AppProviders } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

### 4. Server page: dynamic-import feature → wire signal → client

```js
// lib/serialize-signal.js
import { AppCtx } from '@tao.js/core';

export function toWireSignal(signal) {
  if (signal instanceof AppCtx) {
    return {
      tao: { t: signal.t, a: signal.a, o: signal.o },
      data: signal.data,
    };
  }
  return signal;
}
```

```jsx
// app/page.jsx — Server Component
import { Kernel } from '@tao.js/core';
import { enterRoute, importLoader } from '@tao.js/routing-next';
import { toWireSignal } from '../lib/serialize-signal';
import { HomeClient } from './home-client';

const serverTAO = new Kernel();
const loadHome = importLoader(serverTAO);

export default async function HomePage() {
  const result = await loadHome(import('../tao/home'));
  const signal = result?.signal;

  // Only if SSR handlers on the *server* Kernel matter for this render:
  if (signal) enterRoute(serverTAO, signal);

  return <HomeClient signal={signal ? toWireSignal(signal) : null} />;
}
```

### 5. Client: initialize this heap, then `useRouteSignal`

```jsx
// app/home-client.jsx
'use client';

import { useEffect } from 'react';
import { RenderHandler } from '@tao.js/react';
import { importLoader, useRouteSignal } from '@tao.js/routing-next';
import { TAO } from '../lib/tao-client';

const ensureHome = importLoader(TAO, { skipLoad: true });

export function HomeClient({ signal }) {
  useEffect(() => {
    ensureHome(import('../tao/home'));
  }, []);

  return <HomeView signal={signal} />;
}

function HomeView({ signal }) {
  useRouteSignal(signal);

  return (
    <RenderHandler t="Home" a="View" o="Portal">
      {(tao, data) => <h1>Home</h1>}
    </RenderHandler>
  );
}
```

```text
RSC import('./tao/…') → optional enterRoute(serverTAO)
  → props: serializable signal
  → client initialize(clientTAO) + useRouteSignal → RenderHandler
```

When params change, pass a **new** signal object so `useRouteSignal` re-applies.

### 6. Nested layouts / pages (`skipLoad` / `skipInit`)

Same options as core — map parent layout → `skipLoad: true`, page → `skipInit: true` + `loadSignal` with `params`.

```jsx
// app/products/layout.jsx (server) — optional server init
import { Kernel } from '@tao.js/core';
import { importLoader } from '@tao.js/routing-next';
import { ProductsShell } from './products-shell';

const serverTAO = new Kernel();
const initProduct = importLoader(serverTAO, { skipLoad: true });

export default async function ProductsLayout({ children }) {
  await initProduct(import('../../tao/product'));
  return <ProductsShell>{children}</ProductsShell>;
}
```

```jsx
// app/products/products-shell.jsx — client init for UI Kernel
'use client';
import { useEffect } from 'react';
import { importLoader } from '@tao.js/routing-next';
import { TAO } from '../../lib/tao-client';

const initProduct = importLoader(TAO, { skipLoad: true });

export function ProductsShell({ children }) {
  useEffect(() => {
    initProduct(import('../../tao/product'));
  }, []);
  return children;
}
```

```jsx
// app/products/[id]/page.jsx
import { Kernel } from '@tao.js/core';
import { importLoader } from '@tao.js/routing-next';
import { toWireSignal } from '../../../lib/serialize-signal';
import { ProductDetailsClient } from './product-details-client';

const serverTAO = new Kernel();
const loadDetails = importLoader(serverTAO, {
  skipInit: true,
  loadSignal: ({ locateProduct }, params) => locateProduct(params),
});

export default async function ProductDetailsPage({ params }) {
  const { id } = await params;
  const result = await loadDetails(import('../../../tao/product'), { id });
  return (
    <ProductDetailsClient
      signal={result?.signal ? toWireSignal(result.signal) : null}
    />
  );
}
```

### 7. Pages Router (short)

`getServerSideProps` / `getStaticProps` = host loader: `importLoader` → serializable `props.signal` → same client `useRouteSignal` pattern. Put `<Provider>` in `_app.js`.

### 8. Route handlers / Server Actions

`enterRoute(serverTAO, body)` updates a **server** Kernel only. For UI, return a serializable signal to the client or have the client enter itself.

## Dual-Kernel checklist

| Question               | Guidance                                             |
| ---------------------- | ---------------------------------------------------- |
| Interactive UI Kernel? | Client `Provider`                                    |
| SSR handlers needed?   | Server Kernel + `enterRoute`                         |
| `initialize` on both?  | Expected if both heaps need handlers; guard per heap |
| What crosses RSC?      | `{ tao, data }` or `[tao, data]` only                |

## Data fetching

Choose a primary place (Next `fetch` in the Server Component vs TAO async handlers vs both). Details and tradeoffs: keep signal `data` rich enough to avoid a redundant client fetch when you SSR HTML from the same enter.

## Exports

```js
import {
  importLoader,
  enterRoute,
  useRouteSignal,
  applySignal,
  getSignal,
  createImportLoader,
} from '@tao.js/routing-next';
```
