/** @typedef {import('@tao.js/core').Kernel} Kernel */
/** @typedef {import('./apply-signal').RouteSignal} RouteSignal */

/**
 * A TAO feature module, as dynamic-imported by an import loader:
 * - `default` — `initialize(kernel)` ({@link FeatureInitializer}; required
 *   unless the loader was created with `skipInit`)
 * - `load` — value or helpers handed to the loader's `loadSignal`
 *
 * @typedef {object} FeatureModule
 * @property {FeatureInitializer} [default]
 * @property {*} [load]
 */

/**
 * A feature module's `initialize` (its default export): wires handlers onto
 * the Kernel; may return a cleanup function, which the import loader
 * invokes immediately after initialization.
 *
 * @typedef {(kernel: Kernel) => void | (() => void)} FeatureInitializer
 */

/**
 * Derive the route-entry signal from a feature module's `load` export plus
 * the extra arguments given to the import loader (route params etc.).
 *
 * @typedef {(load: *, ...args: *[]) => RouteSignal | null | undefined} LoadSignalFn
 */

/**
 * What an import loader resolves with (and route-entry hooks consume via
 * `getSignal`): the route-entry signal keyed under `signal`.
 *
 * @typedef {{ signal?: RouteSignal | null }} LoaderResult
 */

/**
 * A host-router loader helper produced by `createImportLoader`: awaits a
 * dynamic-imported {@link FeatureModule}, runs its initializer, and
 * resolves with the {@link LoaderResult} for the route data APIs (or
 * `null` when the loader was created with `skipLoad`).
 *
 * @typedef {(script: FeatureModule | Promise<FeatureModule>, ...args: *[]) => Promise<LoaderResult | null>} ImportLoader
 */

/**
 * Options for `createImportLoader`.
 *
 * @typedef {object} ImportLoaderOptions
 * @property {LoadSignalFn} [loadSignal] `(load, ...args) => signal`;
 *           defaults to passing `load` through as the signal
 * @property {boolean} [skipLoad] resolve `null` instead of a
 *           {@link LoaderResult}
 * @property {boolean} [skipInit] do not require/run the module's
 *           `initialize`
 */

/** @type {LoadSignalFn} */
const defaultLoadSignal = (load) => load;

/**
 * Build a host-router loader helper that dynamic-imports a TAO feature module.
 *
 * Feature modules export:
 * - `default` — `initialize(kernel)` (optional cleanup function return)
 * - `load` — value or helpers passed to `loadSignal`
 *
 * Returns `{ signal }` for the route data APIs, or `null` when `skipLoad`.
 *
 * @param {Kernel} TAO Kernel instance
 * @param {ImportLoaderOptions} [options]
 * @returns {ImportLoader}
 */
export function createImportLoader(
  TAO,
  { loadSignal = defaultLoadSignal, skipLoad = false, skipInit = false } = {},
) {
  return async (script, ...args) => {
    const mod = await script;
    const initializer = mod.default;
    const load = mod.load;

    if (!skipInit) {
      if (typeof initializer !== 'function') {
        throw new TypeError(
          'Feature module default export must be a function (initialize)',
        );
      }
      const initCallback = initializer(TAO);
      if (typeof initCallback === 'function') {
        initCallback();
      }
    }

    if (skipLoad) {
      return null;
    }

    const signal = loadSignal(load, ...args);
    return { signal };
  };
}
