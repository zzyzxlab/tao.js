import {
  importLoader as rrImportLoader,
  useLoaderSignal as rrUseLoaderSignal,
} from '@tao.js/routing-react-router';
import {
  importLoader as tsImportLoader,
  useLoaderSignal as tsUseLoaderSignal,
} from '@tao.js/routing-tanstack-router';
import {
  importLoader as nextImportLoader,
  useRouteSignal,
  enterRoute,
} from '@tao.js/routing-next';
import type { AssertFalse, IsAny } from './helpers';

type _rrImportLoader = AssertFalse<IsAny<typeof rrImportLoader>>;
type _rrUseLoaderSignal = AssertFalse<IsAny<typeof rrUseLoaderSignal>>;
type _tsImportLoader = AssertFalse<IsAny<typeof tsImportLoader>>;
type _tsUseLoaderSignal = AssertFalse<IsAny<typeof tsUseLoaderSignal>>;
type _nextImportLoader = AssertFalse<IsAny<typeof nextImportLoader>>;
type _useRouteSignal = AssertFalse<IsAny<typeof useRouteSignal>>;
type _enterRoute = AssertFalse<IsAny<typeof enterRoute>>;

import { Kernel } from '@tao.js/core';
const kernel = new Kernel();
const rrLoader = rrImportLoader(kernel);
type _rrLoader = AssertFalse<IsAny<typeof rrLoader>>;
const tsLoader = tsImportLoader(kernel);
type _tsLoader = AssertFalse<IsAny<typeof tsLoader>>;
const nextLoader = nextImportLoader(kernel);
type _nextLoader = AssertFalse<IsAny<typeof nextLoader>>;
void rrLoader;
void tsLoader;
void nextLoader;
