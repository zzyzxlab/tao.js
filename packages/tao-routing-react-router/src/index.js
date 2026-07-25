/**
 * @tao.js/routing-react-router — React Router adapter for the tao.js
 * route-entry → AppCon contract: `importLoader` builds route `loader`
 * helpers that dynamic-import TAO feature modules and produce a
 * `{ signal }` bag; `useLoaderSignal` reads it back via `useLoaderData`
 * and applies it to the ambient Kernel.
 *
 * @module @tao.js/routing-react-router
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
 * @typedef {import('@tao.js/routing-core').UseSignalEffectHook} UseSignalEffectHook
 */
export { importLoader } from './import-loader';
export { useLoaderSignal } from './use-loader-signal';
export {
  applySignal,
  getSignal,
  createImportLoader,
} from '@tao.js/routing-core';
