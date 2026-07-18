# `@tao.js/routing-next`

Next.js adapter for route-entry signals into a TAO Kernel.

- **Server / RSC:** `enterRoute(kernel, signal)` or `importLoader` in data-loading code
- **Client:** `useRouteSignal(signal)` with a signal from props / page data

```js
import { enterRoute, useRouteSignal, importLoader } from '@tao.js/routing-next';

// server
enterRoute(TAO, signal);

// client
useRouteSignal(signal);
```

Peer dependencies: `@tao.js/routing-core`, `@tao.js/core`, `@tao.js/react`, `react` (`next` optional peer).
