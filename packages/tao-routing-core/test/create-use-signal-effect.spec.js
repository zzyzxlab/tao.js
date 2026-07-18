import { createUseSignalEffect } from '../src/create-use-signal-effect';
import { applySignal } from '../src/apply-signal';

describe('createUseSignalEffect', () => {
  it('applies a new signal once via injected hooks', () => {
    const TAO = { id: 'kernel' };
    const signal = { tao: { t: 'A', a: 'B', o: 'C' } };
    const apply = jest.fn();
    const ref = { current: null };
    const useRef = jest.fn(() => ref);
    const useTaoContext = jest.fn(() => TAO);
    const useSignal = jest.fn(() => signal);
    let effect;

    const useEffect = jest.fn((fn) => {
      effect = fn;
    });

    const useSignalEffect = createUseSignalEffect({
      useEffect,
      useRef,
      useTaoContext,
      useSignal,
      apply,
    });

    useSignalEffect();
    expect(useTaoContext).toHaveBeenCalled();
    expect(useSignal).toHaveBeenCalled();
    expect(useRef).toHaveBeenCalledWith(null);
    expect(useEffect).toHaveBeenCalledTimes(1);
    expect(useEffect.mock.calls[0][1]).toEqual([TAO, signal]);

    effect();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(TAO, signal);
    expect(ref.current).toBe(signal);

    effect();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('does not apply when signal is null', () => {
    const apply = jest.fn();
    const ref = { current: null };
    let effect;
    const useSignalEffect = createUseSignalEffect({
      useEffect: (fn) => {
        effect = fn;
      },
      useRef: () => ref,
      useTaoContext: () => ({}),
      useSignal: () => null,
      apply,
    });

    useSignalEffect();
    effect();
    expect(apply).not.toHaveBeenCalled();
    expect(ref.current).toBeNull();
  });

  it('does not apply when signal is undefined', () => {
    const apply = jest.fn();
    const ref = { current: null };
    let effect;
    const useSignalEffect = createUseSignalEffect({
      useEffect: (fn) => {
        effect = fn;
      },
      useRef: () => ref,
      useTaoContext: () => ({}),
      useSignal: () => undefined,
      apply,
    });

    useSignalEffect();
    effect();
    expect(apply).not.toHaveBeenCalled();
  });

  it('re-applies when signal identity changes', () => {
    const apply = jest.fn();
    const ref = { current: null };
    const first = { tao: { t: 'A', a: '1', o: 'C' } };
    const second = { tao: { t: 'A', a: '2', o: 'C' } };
    let currentSignal = first;
    let effect;

    const useSignalEffect = createUseSignalEffect({
      useEffect: (fn) => {
        effect = fn;
      },
      useRef: () => ref,
      useTaoContext: () => 'TAO',
      useSignal: () => currentSignal,
      apply,
    });

    useSignalEffect();
    effect();
    expect(apply).toHaveBeenCalledWith('TAO', first);

    currentSignal = second;
    useSignalEffect();
    effect();
    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenLastCalledWith('TAO', second);
  });

  it('defaults apply to applySignal', () => {
    const TAO = {
      setAppCtx: jest.fn(),
      setCtx: jest.fn(),
    };
    const signal = [{ t: 'X', a: 'Y', o: 'Z' }];
    const ref = { current: null };
    let effect;

    const useSignalEffect = createUseSignalEffect({
      useEffect: (fn) => {
        effect = fn;
      },
      useRef: () => ref,
      useTaoContext: () => TAO,
      useSignal: () => signal,
    });

    useSignalEffect();
    effect();
    expect(TAO.setCtx).toHaveBeenCalledWith(signal[0]);
    expect(applySignal(TAO, signal)).toBe(true);
  });
});
