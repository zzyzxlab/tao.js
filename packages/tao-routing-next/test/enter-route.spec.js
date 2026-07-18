import { Kernel, AppCtx } from '@tao.js/core';
import { enterRoute } from '../src/enter-route';

describe('enterRoute', () => {
  it('applies AppCtx via applySignal', () => {
    const kernel = new Kernel();
    const setAppCtx = jest.spyOn(kernel, 'setAppCtx');
    const ac = new AppCtx('Page', 'Enter', 'Portal');
    expect(enterRoute(kernel, ac)).toBe(true);
    expect(setAppCtx).toHaveBeenCalledWith(ac);
  });

  it('returns false for null signal', () => {
    const kernel = new Kernel();
    expect(enterRoute(kernel, null)).toBe(false);
  });

  it('applies array signals', () => {
    const kernel = new Kernel();
    const setCtx = jest.spyOn(kernel, 'setCtx');
    const tao = { t: 'A', a: 'B', o: 'C' };
    expect(enterRoute(kernel, [tao])).toBe(true);
    expect(setCtx).toHaveBeenCalledWith(tao);
  });
});
