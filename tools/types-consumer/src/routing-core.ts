import {
  applySignal,
  getSignal,
  createImportLoader,
  createUseSignalEffect,
  createUseRouteSignal,
} from '@tao.js/routing-core';
import type {
  RouteSignal,
  SignalTuple,
  SignalDescriptor,
  SignalTarget,
  ImportLoader,
  ImportLoaderOptions,
  LoaderResult,
} from '@tao.js/routing-core';
import type { AssertFalse, IsAny } from './helpers';

type _applySignal = AssertFalse<IsAny<typeof applySignal>>;
type _getSignal = AssertFalse<IsAny<typeof getSignal>>;
type _createImportLoader = AssertFalse<IsAny<typeof createImportLoader>>;
type _createUseSignalEffect = AssertFalse<IsAny<typeof createUseSignalEffect>>;
type _createUseRouteSignal = AssertFalse<IsAny<typeof createUseRouteSignal>>;
type _routeSignal = AssertFalse<IsAny<RouteSignal>>;
type _signalTuple = AssertFalse<IsAny<SignalTuple>>;
type _signalDescriptor = AssertFalse<IsAny<SignalDescriptor>>;
type _signalTarget = AssertFalse<IsAny<SignalTarget>>;
type _importLoader = AssertFalse<IsAny<ImportLoader>>;
type _importLoaderOptions = AssertFalse<IsAny<ImportLoaderOptions>>;
type _loaderResult = AssertFalse<IsAny<LoaderResult>>;
