import AppCtxHandlers from './AppCtxHandlers';

describe('AppCtxHandlers', () => {
  it('should create an empty set of Handlers for AppCtx', () => {
    // Assemble
    const expected = {};
    // Act
    const actual = new AppCtxHandlers();
    // Assert
    expect(actual).toEqual(expect.anything());
  });
});
