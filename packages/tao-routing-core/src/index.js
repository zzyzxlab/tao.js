/**
 * @tao.js/routing-core — the framework-agnostic route-entry → AppCon
 * contract for tao.js host-router adapters.
 *
 * Route loaders dynamic-import a feature module (via `createImportLoader`),
 * initialize it against the Kernel, and hand the route data API a
 * `{ signal }` bag; route-entry hooks (built from the hook factories) read
 * that signal back and `applySignal` it to the Kernel. The hook factories
 * take React-shaped functions as injected dependencies so this package
 * never imports React.
 *
 * @module @tao.js/routing-core
 */

/**
 * Shared shapes re-exported for typed consumers (the JSDoc typedefs are the
 * source of truth at their defining modules).
 *
 * @typedef {import('./apply-signal').RouteSignal} RouteSignal
 * @typedef {import('./apply-signal').SignalTuple} SignalTuple
 * @typedef {import('./apply-signal').SignalDescriptor} SignalDescriptor
 * @typedef {import('./apply-signal').SignalTarget} SignalTarget
 * @typedef {import('./create-import-loader').FeatureModule} FeatureModule
 * @typedef {import('./create-import-loader').FeatureInitializer} FeatureInitializer
 * @typedef {import('./create-import-loader').LoadSignalFn} LoadSignalFn
 * @typedef {import('./create-import-loader').LoaderResult} LoaderResult
 * @typedef {import('./create-import-loader').ImportLoader} ImportLoader
 * @typedef {import('./create-import-loader').ImportLoaderOptions} ImportLoaderOptions
 * @typedef {import('./create-use-signal-effect').UseEffectHook} UseEffectHook
 * @typedef {import('./create-use-signal-effect').UseRefHook} UseRefHook
 * @typedef {import('./create-use-signal-effect').UseTaoContextHook} UseTaoContextHook
 * @typedef {import('./create-use-signal-effect').UseSignalHook} UseSignalHook
 * @typedef {import('./create-use-signal-effect').ApplySignalFn} ApplySignalFn
 * @typedef {import('./create-use-signal-effect').UseSignalEffectDeps} UseSignalEffectDeps
 * @typedef {import('./create-use-signal-effect').UseSignalEffectHook} UseSignalEffectHook
 * @typedef {import('./create-use-route-signal').UseRouteSignalDeps} UseRouteSignalDeps
 * @typedef {import('./create-use-route-signal').UseRouteSignalHook} UseRouteSignalHook
 */
export { applySignal } from './apply-signal';
export { getSignal } from './get-signal';
export { createImportLoader } from './create-import-loader';
export { createUseSignalEffect } from './create-use-signal-effect';
export { createUseRouteSignal } from './create-use-route-signal';
