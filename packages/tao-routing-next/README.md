# `@tao.js/routing-next`

Next.js adapter for **route-entry signals** into a TAO Kernel.

Next has no universal “loader data → `useLoaderData`” bridge like React Router / TanStack. This package therefore splits server vs client:

| Surface                       | API                                                |
| ----------------------------- | -------------------------------------------------- |
| Server / RSC / route handlers | `enterRoute(kernel, signal)` and/or `importLoader` |
| Client components             | `useRouteSignal(signal)` with an explicit signal   |

Shared contract (signal shapes, `createImportLoader` options): [`@tao.js/routing-core`](../tao-routing-core/README.md).

## Install

```sh
pnpm add @tao.js/routing-next @tao.js/routing-core @tao.js/core @tao.js/react react react-dom
# App Router or Pages Router
pnpm add next
```

**Peer dependencies:** `@tao.js/routing-core`, `@tao.js/core`, `@tao.js/react`, `react` (`>=16.8`); `next` (`>=13`, optional).

---

## Feature modules

> **Set this up first.** Every Next entry path (`enterRoute`, `useRouteSignal`, layout vs page) assumes a TAO feature module with the same shape as the SPA adapters.

| Export    | Role                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| `default` | `initialize(TAO)` — register handlers on the Kernel you pass in (idempotent if you guard it) |
| `load`    | Route-entry value **or** a bag of helpers that produce a signal                              |

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

// Prefer a serializable shape when the signal will cross the RSC boundary.
export const load = {
  tao: { t: 'Home', a: 'Enter', o: 'Portal' },
  data: {},
};
```

Shared feature for nested segments (layout init + page load helpers):

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
  return {
    tao: { t: 'Product', a: 'Find', o: 'Portal' },
    data: {},
  };
}

export function locateProduct({ id }) {
  return {
    tao: { t: 'Product', a: 'Select', o: 'Portal' },
    data: { Select: { id } },
  };
}

export const load = { fetchProducts, locateProduct };
```

Load a module against a Kernel you own:

```js
import { importLoader } from '@tao.js/routing-next';

const loadHome = importLoader(TAO);
const result = await loadHome(import('./tao/home'));
// result === { signal } | null (null when skipLoad: true)
```

| Option       | Default          | Meaning                                     |
| ------------ | ---------------- | ------------------------------------------- |
| `skipInit`   | `false`          | Skip `initialize`                           |
| `skipLoad`   | `false`          | After init, return `null` (no `{ signal }`) |
| `loadSignal` | `(load) => load` | `(load, ...args) => signal`                 |

---

## Mental model (read this once)

Server and client are **different Kernels**. Nothing you do with `enterRoute` on the server automatically registers handlers or fires AppCons on the browser Kernel.

Typical interactive App Router app:

1. **Client** `layout` owns one Kernel + `<Provider>` (and usually runs `initialize` for features the UI needs).
2. **Server** page (optional) builds a **serializable** signal and may `enterRoute` on a **server** Kernel if SSR handlers matter.
3. Server page passes that signal as props into a client child.
4. Client child calls `useRouteSignal(signal)` so the **client** Kernel enters the route; `RenderHandler` paints.

If you only care about the interactive client tree, you can skip server `enterRoute` entirely and only pass a serializable signal (or build the signal on the client).

---

## App Router happy path

### 1. Client Kernel + root Provider

```js
// lib/tao-client.js
'use client';

import { Kernel } from '@tao.js/core';

// One browser Kernel for the app session.
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

### 2. Serialize the signal for the wire

`AppCtx` instances do **not** survive RSC → client props. Pass plain data:

```js
// Good — crosses RSC as props
{ tao: { t: 'Home', a: 'Enter', o: 'Portal' }, data: {} }

// Also fine
[{ t: 'Home', a: 'Enter', o: 'Portal' }, { Home: { id: '1' } }]

// Bad as a prop — class instance will not round-trip
new AppCtx('Home', 'Enter', 'Portal')
```

Helper pattern (optional):

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
  return signal; // already { tao, data } or [tao, data]
}
```

### 3. Server page: build signal, optional server enter, pass to client

```jsx
// app/page.jsx — Server Component
import { Kernel } from '@tao.js/core';
import { enterRoute, importLoader } from '@tao.js/routing-next';
import { toWireSignal } from '../lib/serialize-signal';
import { HomeClient } from './home-client';

// Optional: server-only Kernel if SSR handlers must run during RSC.
const serverTAO = new Kernel();
const loadHome = importLoader(serverTAO);

export default async function HomePage() {
  const result = await loadHome(import('../tao/home'));
  const signal = result?.signal;

  if (signal) {
    // Only if you need handlers on the *server* Kernel for this render.
    enterRoute(serverTAO, signal);
  }

  // Always pass a serializable signal if the *client* Kernel must enter.
  const wireSignal = signal ? toWireSignal(signal) : null;

  return <HomeClient signal={wireSignal} />;
}
```

### 4. Client page: initialize (if needed), `useRouteSignal`, `RenderHandler`

Client features must be initialized on the **client** Kernel. Either:

- call `importLoader(clientTAO)` once from a client effect / layout, or
- import the module and call `initialize(TAO)` directly in client code.

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
    // Register client handlers once; skipLoad so we don't double-fire from importLoader.
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

`useRouteSignal` applies the signal once per signal **identity**. When the route param changes, pass a **new** signal object (new props from the server page) so the client Kernel re-enters.

Flow:

```text
RSC page → importLoader(serverTAO?) → optional enterRoute(server)
        → props: serializable signal
        → client initialize(clientTAO) + useRouteSignal(signal)
        → handlers → RenderHandler
```

---

## Nested App Router segments

Same `skipInit` / `skipLoad` idea as SPA loaders, mapped onto layouts vs pages.

```jsx
// app/products/layout.jsx — Server Component (init only on server Kernel, optional)
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
// app/products/products-shell.jsx
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
// app/products/[id]/page.jsx — Server Component
import { importLoader } from '@tao.js/routing-next';
import { Kernel } from '@tao.js/core';
import { toWireSignal } from '../../../lib/serialize-signal';
import { ProductDetailsClient } from './product-details-client';

const serverTAO = new Kernel();
const loadDetails = importLoader(serverTAO, {
  skipInit: true, // layout already initialized (on whichever Kernel you care about)
  loadSignal: ({ locateProduct }, params) => locateProduct(params),
});

export default async function ProductDetailsPage({ params }) {
  const { id } = await params;
  const result = await loadDetails(import('../../../tao/product'), { id });
  const wireSignal = result?.signal ? toWireSignal(result.signal) : null;
  return <ProductDetailsClient signal={wireSignal} />;
}
```

```jsx
// app/products/[id]/product-details-client.jsx
'use client';

import { RenderHandler } from '@tao.js/react';
import { useRouteSignal } from '@tao.js/routing-next';

export function ProductDetailsClient({ signal }) {
  useRouteSignal(signal);

  return (
    <RenderHandler t="Product" a="View" o="Portal">
      {(tao, data) => <h1>Product {data.Product?.id}</h1>}
    </RenderHandler>
  );
}
```

---

## Dual-Kernel checklist

| Question                         | Guidance                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Who owns interactive UI?         | Client Kernel in `AppProviders`                                                           |
| Must handlers run during RSC?    | Only then create a server Kernel + `enterRoute`                                           |
| Does `initialize` run twice?     | Yes if you init on both Kernels — that is expected; guard with a module flag **per heap** |
| Can one Kernel span RSC↔client? | No                                                                                        |
| What crosses the boundary?       | Serializable `{ tao, data }` or `[tao, data]` props only                                  |

---

## Pages Router (short path)

Same split: build a serializable signal in data APIs, pass as page props, enter on the client.

```js
// pages/index.js
import { importLoader } from '@tao.js/routing-next';
import { Kernel } from '@tao.js/core';
import { HomeClient } from '../components/HomeClient';

const serverTAO = new Kernel();
const loadHome = importLoader(serverTAO);

export async function getServerSideProps() {
  const result = await loadHome(import('../tao/home'));
  const signal = result?.signal ?? null;
  // optional: enterRoute(serverTAO, signal)
  return {
    props: {
      signal:
        signal && signal.tao
          ? { tao: signal.tao, data: signal.data ?? {} }
          : signal,
    },
  };
}

export default function HomePage({ signal }) {
  return <HomeClient signal={signal} />;
}
```

`HomeClient` is the same as the App Router client example (`Provider` may already wrap `_app.js`).

---

## Route handlers / Server Actions

Use `enterRoute` when a **server** Kernel should react to an HTTP or action entry (e.g. webhook → AppCon). That does not update the browser Kernel. For UI, return a serializable signal (or trigram + data) to the client and call `useRouteSignal`, or have the client `setCtx` / `setAppCtx` itself.

```js
// app/api/enter/route.js
import { Kernel } from '@tao.js/core';
import { enterRoute } from '@tao.js/routing-next';

const serverTAO = new Kernel();
// …initialize features on serverTAO once per process if needed…

export async function POST(request) {
  const body = await request.json(); // { tao, data }
  enterRoute(serverTAO, body);
  return Response.json({ ok: true });
}
```

---

## Data fetching

Pick one primary place so you do not double-fetch:

- **Next `fetch` / server page** — load data in the Server Component, put results into the signal’s `data`, pass to the client; TAO handlers can be thin (View only).
- **TAO async/inline handlers** — signal is just “enter / find”; handlers fetch and chain to View AppCons that `RenderHandler` matches.
- **Both** — only when server needs data for SSR HTML _and_ the client Kernel re-runs a similar enter (pass enough in `data` to avoid a redundant client fetch, or accept the second load).

---

## Accepted signal shapes

| Shape                           | Applied as                 |
| ------------------------------- | -------------------------- |
| `AppCtx`                        | `kernel.setAppCtx(signal)` |
| `[tao, data?]` (non-empty)      | `kernel.setCtx(...signal)` |
| `{ tao, data? }` (`tao` truthy) | `kernel.setCtx(tao, data)` |

Prefer `{ tao, data }` for anything that crosses RSC / `getServerSideProps`.

---

## SSR caveats (short)

1. **Kernel identity** — server ≠ client.
2. **No loader-data bridge** — you pass the signal yourself.
3. **Serialize** — no live `AppCtx` over the wire.
4. **`importLoader` binds to the Kernel you pass** — server init ≠ client init.

---

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
