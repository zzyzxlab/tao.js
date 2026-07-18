import { applySignal } from './apply-signal';

/**
 * Factory for a React hook that applies an explicit route-entry signal
 * (Next.js pages, RSC props, etc. — no host loader data API).
 *
 * @param {object} deps
 * @param {Function} deps.useEffect
 * @param {Function} deps.useRef
 * @param {Function} deps.useTaoContext
 * @param {Function} [deps.apply]
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
