/**
 * @tao.js/react — React adapter for the TAO signal network.
 *
 * Wrap a tree in {@link TaoProvider} with a `Kernel` (or the default `TAO`)
 * from `@tao.js/core`, then react to AppCons with `RenderHandler` /
 * `SwitchHandler`, share handler-managed data with `DataHandler` +
 * `useTaoData(name)`, and register handlers with the `useTaoInlineHandler` /
 * `useTaoAsyncHandler` / `useTaoInterceptHandler` hooks.
 *
 * @module @tao.js/react
 */

/**
 * Shared shapes re-exported for typed consumers (the JSDoc typedefs are the
 * source of truth at their defining modules).
 *
 * @typedef {import('./helpers').TrigramPart} TrigramPart
 * @typedef {import('./helpers').TrigramProps} TrigramProps
 * @typedef {import('./helpers').NormalizedTrigram} NormalizedTrigram
 * @typedef {import('./helpers').TaoSignal} TaoSignal
 * @typedef {import('./DataLayerContext').DataLayer} DataLayer
 * @typedef {import('./Provider').ProviderContextValue} ProviderContextValue
 * @typedef {import('./Provider').TaoProviderProps} TaoProviderProps
 * @typedef {import('./DataHandler').DataHandlerProps} DataHandlerProps
 * @typedef {import('./RenderHandler').RenderHandlerProps} RenderHandlerProps
 * @typedef {import('./RenderHandler').RenderHandlerChildren} RenderHandlerChildren
 * @typedef {import('./SwitchHandler').SwitchHandlerProps} SwitchHandlerProps
 * @typedef {import('./SwitchContext').SwitchContextValue} SwitchContextValue
 */
/**
 * @template [S=any]
 * @typedef {import('./useTaoDataState').TaoDataHandler<S>} TaoDataHandler
 */
/**
 * @template [S=any]
 * @typedef {import('./createContextHandler').ContextHandler<S>} ContextHandler
 */
export { default as TaoProvider } from './Provider';
export { default as DataHandler } from './DataHandler';
export { default as RenderHandler } from './RenderHandler';
export { default as SwitchHandler } from './SwitchHandler';
export { default as createContextHandler } from './createContextHandler';
export { default as withContext } from './withContext';
export { DataLayerContext, useDataLayers } from './DataLayerContext';
export * from './hooks';
