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
 * @param {*} TAO Kernel instance
 * @param {object} [options]
 * @param {Function} [options.loadSignal] `(load, ...args) => signal`
 * @param {boolean} [options.skipLoad]
 * @param {boolean} [options.skipInit]
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
