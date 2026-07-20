import { AppCtx, Kernel } from '@tao.js/core';
import { applySignal } from '../src/apply-signal';

describe('applySignal', () => {
  let kernel;
  let setAppCtx;
  let setCtx;

  beforeEach(() => {
    kernel = new Kernel();
    setAppCtx = jest.spyOn(kernel, 'setAppCtx');
    setCtx = jest.spyOn(kernel, 'setCtx');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false for null', () => {
    expect(applySignal(kernel, null)).toBe(false);
    expect(setAppCtx).not.toHaveBeenCalled();
    expect(setCtx).not.toHaveBeenCalled();
  });

  it('returns false for undefined', () => {
    expect(applySignal(kernel, undefined)).toBe(false);
    expect(setAppCtx).not.toHaveBeenCalled();
    expect(setCtx).not.toHaveBeenCalled();
  });

  it('sets AppCtx via setAppCtx', () => {
    const ac = new AppCtx('User', 'Find', 'Portal');
    expect(applySignal(kernel, ac)).toBe(true);
    expect(setAppCtx).toHaveBeenCalledTimes(1);
    expect(setAppCtx).toHaveBeenCalledWith(ac);
    expect(setCtx).not.toHaveBeenCalled();
  });

  it('sets array signal via setCtx spread', () => {
    const tao = { t: 'User', a: 'Find', o: 'Portal' };
    const data = { User: { id: '1' } };
    expect(applySignal(kernel, [tao, data])).toBe(true);
    expect(setCtx).toHaveBeenCalledTimes(1);
    expect(setCtx).toHaveBeenCalledWith(tao, data);
    expect(setAppCtx).not.toHaveBeenCalled();
  });

  it('sets single-element array via setCtx', () => {
    const tao = { t: 'User', a: 'Find', o: 'Portal' };
    expect(applySignal(kernel, [tao])).toBe(true);
    expect(setCtx).toHaveBeenCalledWith(tao);
  });

  it('returns false for empty array', () => {
    expect(applySignal(kernel, [])).toBe(false);
    expect(setCtx).not.toHaveBeenCalled();
  });

  it('sets object signal with tao via setCtx', () => {
    const tao = { t: 'User', a: 'Find', o: 'Portal' };
    const data = { User: { id: '2' } };
    expect(applySignal(kernel, { tao, data })).toBe(true);
    expect(setCtx).toHaveBeenCalledWith(tao, data);
  });

  it('sets object signal with tao and undefined data', () => {
    const tao = { t: 'User', a: 'Find', o: 'Portal' };
    expect(applySignal(kernel, { tao })).toBe(true);
    expect(setCtx).toHaveBeenCalledWith(tao, undefined);
  });

  it('returns false for object without tao', () => {
    expect(applySignal(kernel, { data: {} })).toBe(false);
    expect(setCtx).not.toHaveBeenCalled();
  });

  it('returns false for object with falsy tao', () => {
    expect(applySignal(kernel, { tao: null, data: {} })).toBe(false);
    expect(applySignal(kernel, { tao: '', data: {} })).toBe(false);
    expect(setCtx).not.toHaveBeenCalled();
  });

  it('returns false for non-signal primitives', () => {
    expect(applySignal(kernel, 'nope')).toBe(false);
    expect(applySignal(kernel, 0)).toBe(false);
    expect(applySignal(kernel, true)).toBe(false);
    expect(setAppCtx).not.toHaveBeenCalled();
    expect(setCtx).not.toHaveBeenCalled();
  });
});
