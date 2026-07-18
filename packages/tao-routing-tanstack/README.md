# `@tao.js/routing-tanstack-router`

TanStack Router adapter: **loaders as TAO AppCon entry points**.

```js
import { importLoader, useLoaderSignal } from '@tao.js/routing-tanstack-router';

const homeLoader = importLoader(TAO);
// route options.loader = () => homeLoader(import('./tao/home'));

function HomePage() {
  useLoaderSignal();
  return <RenderHandler>...</RenderHandler>;
}
```

Peer dependencies: `@tao.js/routing-core`, `@tao.js/core`, `@tao.js/react`, `react`, `@tanstack/react-router`.
