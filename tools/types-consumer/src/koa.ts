import taoHttpMiddleware, {
  simpleMiddleware,
  enhancedMiddleware,
} from '@tao.js/koa';
import type {
  KoaContextLike,
  KoaMiddleware,
  TaoSignaler,
  TrigramSets,
} from '@tao.js/koa';
import { Kernel } from '@tao.js/core';
import type { AssertFalse, IsAny } from './helpers';

type _default = AssertFalse<IsAny<typeof taoHttpMiddleware>>;
type _simple = AssertFalse<IsAny<typeof simpleMiddleware>>;
type _enhanced = AssertFalse<IsAny<typeof enhancedMiddleware>>;
type _ctxLike = AssertFalse<IsAny<KoaContextLike>>;
type _koaMw = AssertFalse<IsAny<KoaMiddleware>>;
type _signaler = AssertFalse<IsAny<TaoSignaler>>;
type _trigramSets = AssertFalse<IsAny<TrigramSets>>;

const kernel = new Kernel();
const middleware = taoHttpMiddleware(kernel, {});
type _middleware = AssertFalse<IsAny<typeof middleware>>;
const simple = simpleMiddleware(kernel, {});
type _simpleMw = AssertFalse<IsAny<typeof simple>>;
const enhanced = enhancedMiddleware(kernel, {});
type _enhancedMw = AssertFalse<IsAny<typeof enhanced>>;
void middleware;
void simple;
void enhanced;
