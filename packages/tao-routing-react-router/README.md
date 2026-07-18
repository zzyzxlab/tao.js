# `@tao.js/routing-react-router`

React Router adapter: **loaders as TAO AppCon entry points**.

```js
import { importLoader, useLoaderSignal } from '@tao.js/routing-react-router';

const homeLoader = importLoader(TAO);
// route.loader = () => homeLoader(import('./tao/home'));

function HomePage() {
  useLoaderSignal();
  return <RenderHandler>...</RenderHandler>;
}
```

Peer dependencies: `@tao.js/routing-core`, `@tao.js/core`, `@tao.js/react`, `react`, `react-router` (≥6.4).
