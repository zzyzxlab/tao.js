import Kernel from './Kernel';
import TAO, { AppCtx } from './index';

describe('TAO is a new way of programming', () => {
  it('should exist', () => {
    expect(TAO).toEqual(expect.anything());
  });

  it('should be an instance of Kernel', () => {
    expect(TAO).toBeInstanceOf(Kernel);
  });

  it('should export AppCtx', () => {
    expect(AppCtx).toBeDefined();
  });
});
