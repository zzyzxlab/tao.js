import init, { route } from '@tao.js/router';
import type { HistoryLike, RouterOptions, RouteConfig } from '@tao.js/router';
import { Kernel } from '@tao.js/core';
import type { AssertFalse, IsAny } from './helpers';

type _init = AssertFalse<IsAny<typeof init>>;
type _route = AssertFalse<IsAny<typeof route>>;
type _history = AssertFalse<IsAny<HistoryLike>>;
type _options = AssertFalse<IsAny<RouterOptions>>;
type _routeConfig = AssertFalse<IsAny<RouteConfig>>;

const kernel = new Kernel();
init(kernel);
