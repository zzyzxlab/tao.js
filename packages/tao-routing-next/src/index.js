/**
 * @tao.js/routing-next — Next.js adapter for the tao.js route-entry →
 * AppCon contract: `importLoader` dynamic-imports TAO feature modules and
 * produces a `{ signal }` bag; `useRouteSignal` applies an explicit
 * route-entry signal from page/server props on the client, and
 * `enterRoute` applies one on the server (RSC / route handlers).
 *
 * @module @tao.js/routing-next
 */

/**
 * Shared shapes re-exported for typed consumers (defined by
 * `@tao.js/routing-core`).
 *
 * @typedef {import('@tao.js/routing-core').RouteSignal} RouteSignal
 * @typedef {import('@tao.js/routing-core').SignalTuple} SignalTuple
 * @typedef {import('@tao.js/routing-core').SignalDescriptor} SignalDescriptor
 * @typedef {import('@tao.js/routing-core').SignalTarget} SignalTarget
 * @typedef {import('@tao.js/routing-core').FeatureModule} FeatureModule
 * @typedef {import('@tao.js/routing-core').FeatureInitializer} FeatureInitializer
 * @typedef {import('@tao.js/routing-core').LoadSignalFn} LoadSignalFn
 * @typedef {import('@tao.js/routing-core').LoaderResult} LoaderResult
 * @typedef {import('@tao.js/routing-core').ImportLoader} ImportLoader
 * @typedef {import('@tao.js/routing-core').ImportLoaderOptions} ImportLoaderOptions
 * @typedef {import('@tao.js/routing-core').UseRouteSignalHook} UseRouteSignalHook
 */
export { importLoader } from './import-loader';
export { useRouteSignal } from './use-route-signal';
export { enterRoute } from './enter-route';
export {
  applySignal,
  getSignal,
  createImportLoader,
} from '@tao.js/routing-core';
