import { applySignal } from './apply-signal';

/** @typedef {import('./apply-signal').RouteSignal} RouteSignal */
/** @typedef {import('./apply-signal').SignalTarget} SignalTarget */

/**
 * React `useEffect`-shaped function, typed structurally so this package
 * never imports React — inject `React.useEffect` (or a compatible stand-in
 * for tests).
 *
 * @typedef {(effect: () => void | (() => void), deps?: ReadonlyArray<*>) => void} UseEffectHook
 */

/**
 * React `useRef`-shaped function, typed structurally so this package never
 * imports React — inject `React.useRef` (or a compatible stand-in).
 *
 * @typedef {(initialValue: *) => { current: * }} UseRefHook
 */

/**
 * Hook returning the ambient TAO Kernel (any {@link SignalTarget}) —
 * `useTaoContext` from `@tao.js/react`, or a compatible stand-in.
 *
 * @typedef {() => SignalTarget} UseTaoContextHook
 */

/**
 * Hook reading the current route-entry signal from the host router's data
 * API (must call hooks internally, e.g. wrap `useLoaderData`).
 *
 * @typedef {() => RouteSignal | null | undefined} UseSignalHook
 */

/**
 * Apply a route-entry signal to a Kernel-shaped target — `applySignal`'s
 * shape (injectable for tests).
 *
 * @typedef {(kernel: SignalTarget, signal: RouteSignal | null | undefined) => boolean} ApplySignalFn
 */

/**
 * The hook a `createUseSignalEffect` factory returns: reads the host
 * router's signal each render and applies each new signal identity to the
 * ambient Kernel exactly once.
 *
 * @typedef {() => void} UseSignalEffectHook
 */

/**
 * Dependencies injected into `createUseSignalEffect`.
 *
 * @typedef {object} UseSignalEffectDeps
 * @property {UseEffectHook} useEffect
 * @property {UseRefHook} useRef
 * @property {UseTaoContextHook} useTaoContext
 * @property {UseSignalHook} useSignal `() => signal` (must call hooks internally)
 * @property {ApplySignalFn} [apply]
 */

/**
 * Factory for a React hook that applies a signal from a host-router data API.
 *
 * Inject React / router / TAO hooks so this package stays free of React imports.
 *
 * @param {UseSignalEffectDeps} deps
 * @returns {UseSignalEffectHook}
 */
export function createUseSignalEffect({
  useEffect,
  useRef,
  useTaoContext,
  useSignal,
  apply = applySignal,
}) {
  return function useSignalEffect() {
    const TAO = useTaoContext();
    const signal = useSignal();
    const applied = useRef(null);

    useEffect(() => {
      if (signal == null) {
        return;
      }
      if (applied.current === signal) {
        return;
      }
      applied.current = signal;
      apply(TAO, signal);
    }, [TAO, signal]);
  };
}
