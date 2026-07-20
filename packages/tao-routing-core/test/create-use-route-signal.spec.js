import { createUseRouteSignal } from '../src/create-use-route-signal';

describe('createUseRouteSignal', () => {
  it('applies an explicit signal once', () => {
    const TAO = { id: 'k' };
    const signal = { tao: { t: 'A', a: 'B', o: 'C' } };
    const apply = jest.fn();
    const ref = { current: null };
    let effect;
    const useEffect = jest.fn((fn) => {
      effect = fn;
    });

    const useRouteSignal = createUseRouteSignal({
      useEffect,
      useRef: () => ref,
      useTaoContext: () => TAO,
      apply,
    });

    useRouteSignal(signal);
    expect(effect).toBeDefined();
    expect(useEffect.mock.calls[0][1]).toEqual([TAO, signal]);
    effect();
    expect(apply).toHaveBeenCalledWith(TAO, signal);
    expect(ref.current).toBe(signal);

    effect();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('skips null and undefined signals', () => {
    const apply = jest.fn();
    const ref = { current: null };
    let effect;

    const useRouteSignal = createUseRouteSignal({
      useEffect: (fn) => {
        effect = fn;
      },
      useRef: () => ref,
      useTaoContext: () => ({}),
      apply,
    });

    useRouteSignal(null);
    effect();
    expect(apply).not.toHaveBeenCalled();

    useRouteSignal(undefined);
    effect();
    expect(apply).not.toHaveBeenCalled();
  });

  it('re-applies when argument identity changes', () => {
    const apply = jest.fn();
    const ref = { current: null };
    const a = { tao: { t: 'A', a: '1', o: 'C' } };
    const b = { tao: { t: 'A', a: '2', o: 'C' } };
    let effect;

    const useRouteSignal = createUseRouteSignal({
      useEffect: (fn) => {
        effect = fn;
      },
      useRef: () => ref,
      useTaoContext: () => 'TAO',
      apply,
    });

    useRouteSignal(a);
    effect();
    useRouteSignal(b);
    effect();
    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply.mock.calls[0][1]).toBe(a);
    expect(apply.mock.calls[1][1]).toBe(b);
  });

  it('defaults apply to applySignal', () => {
    const TAO = {
      setAppCtx: jest.fn(),
      setCtx: jest.fn(),
    };
    const signal = { tao: { t: 'A', a: 'B', o: 'C' }, data: { x: 1 } };
    const ref = { current: null };
    let effect;

    const useRouteSignal = createUseRouteSignal({
      useEffect: (fn) => {
        effect = fn;
      },
      useRef: () => ref,
      useTaoContext: () => TAO,
    });

    useRouteSignal(signal);
    effect();
    expect(TAO.setCtx).toHaveBeenCalledWith(signal.tao, signal.data);
  });
});
