import taoSocketIO from '../src';

describe('@tao.js/socket.io exports a function to wire up the TAO to Socket.io', () => {
  it('should export a function', () => {
    expect(taoSocketIO).toBeDefined();
    expect(taoSocketIO).toBeInstanceOf(Function);
  });
});
