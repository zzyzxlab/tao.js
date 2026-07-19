# `@tao.js/routing-next`

Next.js adapter for **route-entry signals** into a TAO Kernel.

Next has no universal “loader data → `useLoaderData`” bridge like React Router / TanStack. This package therefore splits server vs client:

| Surface                       | API                                                |
| ----------------------------- | -------------------------------------------------- |
| Server / RSC / route handlers | `enterRoute(kernel, signal)` and/or `importLoader` |
| Client components             | `useRouteSignal(signal)` with an explicit signal   |

Shared contract (feature modules, `createImportLoader` options, signal shapes): [`@tao.js/routing-core`](../tao-routing-core/README.md). Full SPA loader walkthrough: [`@tao.js/routing-react-router`](../tao-routing-react-router/README.md).

## Install

```sh
pnpm add @tao.js/routing-next @tao.js/routing-core @tao.js/core @tao.js/react react
# next is an optional peer (>=13) when you use the App/Pages Router
pnpm add next
```

**Peer dependencies:** `@tao.js/routing-core`, `@tao.js/core`, `@tao.js/react`, `react` (`>=16.8`); `next` (`>=13`, optional).

## Feature modules

Same shape as the other adapters — `default` = `initialize(TAO)`, named `load` for entry:

```js
// tao/home.js
import { AppCtx } from '@tao.js/core';

export default function initialize(TAO) {
  TAO.addInlineHandler({ t: 'Home', a: 'Enter', o: 'Portal' }, () => {
    return new AppCtx('Home', 'View', 'Portal');
  });
}

export const load = new AppCtx('Home', 'Enter', 'Portal');
```

```js
import { importLoader } from '@tao.js/routing-next';

const loadHome = importLoader(TAO);
const { signal } = (await loadHome(import('./tao/home'))) ?? {};
```

`skipInit` / `skipLoad` / `loadSignal` work the same as in `@tao.js/routing-core`.

## Server / RSC: `enterRoute`

Apply a signal on a Kernel you control in the server/RSC context:

```js
import { Kernel, AppCtx } from '@tao.js/core';
import { enterRoute, importLoader } from '@tao.js/routing-next';

const TAO = new Kernel();
const loadHome = importLoader(TAO);

export default async function HomePage() {
  const result = await loadHome(import('../tao/home'));
  if (result?.signal) {
    enterRoute(TAO, result.signal);
  }
  // …render; pass a serializable signal to the client if the client Kernel must enter too
  return <HomeClient signal={/* see caveats */} />;
}
```

`enterRoute(kernel, signal)` is `applySignal` — accepted shapes:

- `AppCtx` → `setAppCtx`
- `[tao, data?]` → `setCtx(...signal)`
- `{ tao, data? }` → `setCtx(tao, data)` when `tao` is truthy

## Client: `useRouteSignal(signal)`

Unlike `useLoaderSignal`, you pass the signal in (from props, page data, or a client-built AppCtx):

```jsx
'use client';

import { Provider, RenderHandler } from '@tao.js/react';
import { useRouteSignal } from '@tao.js/routing-next';
import { TAO } from '../tao-client';

export function HomeClient({ signal }) {
  return (
    <Provider TAO={TAO}>
      <HomeView signal={signal} />
    </Provider>
  );
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

## SSR caveats (do not over-assume)

1. **Kernel identity** — Server and client are different JS heaps. A Kernel you `enterRoute` on during RSC is not the same instance as a client `Provider` Kernel unless you deliberately share one (you usually cannot across the RSC boundary). Decide whether handlers must run on the server, the client, or both.

2. **No automatic loader-data bridge** — There is no built-in `useLoaderData` equivalent that carries `{ signal }` into the client. If the client Kernel must enter the route, pass a **serializable** signal (`{ tao, data }` or `[tao, data]`) as props / page data and call `useRouteSignal(signal)`. Plain `AppCtx` instances do not cross the RSC wire unless you reconstruct them on the client.

3. **When to signal server vs client**
   - Server/`enterRoute`: work that must happen while rendering on the server (handlers that only matter for SSR output, or server-only Kernel usage).
   - Client/`useRouteSignal`: interactive React tree under `Provider` + `RenderHandler` / hooks.
   - Calling both with the same logical trigram is fine only if each Kernel is supposed to run that entry.

4. **`importLoader` on the server** still runs `initialize(TAO)` against whatever Kernel you pass — useful for registering server handlers; it does not install those handlers on the browser Kernel.

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
