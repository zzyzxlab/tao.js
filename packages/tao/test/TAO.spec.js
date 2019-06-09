import Kernel from '../src/Kernel';
import TAO, { AppCtx, INTERCEPT, ASYNC, INLINE } from '../src';

describe('TAO is a new way of programming', () => {
  it('should exist', () => {
    expect(TAO).toEqual(expect.anything());
  });

  it('should be an instance of Kernel', () => {
    expect(TAO).toBeInstanceOf(Kernel);
  });

  it('should export AppCtx', () => {
    expect(AppCtx).toBeDefined();
    expect(new AppCtx()).toBeInstanceOf(AppCtx);
  });

  it('should export 3 handler type constants', () => {
    expect(INTERCEPT).toBeDefined();
    expect(ASYNC).toBeDefined();
    expect(INLINE).toBeDefined();
  });
});
