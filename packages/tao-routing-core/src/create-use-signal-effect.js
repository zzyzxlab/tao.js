import { applySignal } from './apply-signal';

/**
 * Factory for a React hook that applies a signal from a host-router data API.
 *
 * Inject React / router / TAO hooks so this package stays free of React imports.
 *
 * @param {object} deps
 * @param {Function} deps.useEffect
 * @param {Function} deps.useRef
 * @param {Function} deps.useTaoContext
 * @param {Function} deps.useSignal `() => signal` (must call hooks internally)
 * @param {Function} [deps.apply]
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
