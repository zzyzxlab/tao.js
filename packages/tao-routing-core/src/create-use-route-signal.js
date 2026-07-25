import { applySignal } from './apply-signal';

/** @typedef {import('./apply-signal').RouteSignal} RouteSignal */
/** @typedef {import('./create-use-signal-effect').UseEffectHook} UseEffectHook */
/** @typedef {import('./create-use-signal-effect').UseRefHook} UseRefHook */
/** @typedef {import('./create-use-signal-effect').UseTaoContextHook} UseTaoContextHook */
/** @typedef {import('./create-use-signal-effect').ApplySignalFn} ApplySignalFn */

/**
 * The hook a `createUseRouteSignal` factory returns: applies each new
 * identity of an explicitly-passed route-entry signal to the ambient
 * Kernel exactly once.
 *
 * @typedef {(signal: RouteSignal | null | undefined) => void} UseRouteSignalHook
 */

/**
 * Dependencies injected into `createUseRouteSignal`.
 *
 * @typedef {object} UseRouteSignalDeps
 * @property {UseEffectHook} useEffect
 * @property {UseRefHook} useRef
 * @property {UseTaoContextHook} useTaoContext
 * @property {ApplySignalFn} [apply]
 */

/**
 * Factory for a React hook that applies an explicit route-entry signal
 * (Next.js pages, RSC props, etc. — no host loader data API).
 *
 * @param {UseRouteSignalDeps} deps
 * @returns {UseRouteSignalHook}
 */
export function createUseRouteSignal({
  useEffect,
  useRef,
  useTaoContext,
  apply = applySignal,
}) {
  return function useRouteSignal(signal) {
    const TAO = useTaoContext();
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
