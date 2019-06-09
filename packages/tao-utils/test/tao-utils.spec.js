import * as utils from '../src';

describe('@tao.js/utils exports ...', () => {
  it('should export bridge functions', () => {
    expect(utils.interceptBridge).toBeDefined();
    expect(utils.interceptBridge).toBeInstanceOf(Function);
    expect(utils.asyncBridge).toBeDefined();
    expect(utils.asyncBridge).toBeInstanceOf(Function);
    expect(utils.inlineBridge).toBeDefined();
    expect(utils.inlineBridge).toBeInstanceOf(Function);
  });

  it('should export trigram filter factory', () => {
    expect(utils.trigramFilter).toBeDefined();
    expect(utils.trigramFilter).toBeInstanceOf(Function);
  });
});
