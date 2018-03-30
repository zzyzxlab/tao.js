import { AppCtx, WILDCARD } from './index';
// const matchers = require('../../../config/matchers');

describe('AppCtx should hold a tao App Context', () => {
  // beforeEach(() => {
  //   expect.extend(matchers());
  // });

  it('should create an empty AppCtx', () => {
    // Assemble
    const expected = { t: WILDCARD, a: WILDCARD, o: WILDCARD, data: {} };
    // Act
    const actual = new AppCtx();
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should create a concrete AppCtx', () => {
    // Assemble
    const TERM = 'colleague';
    const ACTION = 'hug';
    const ORIENT = 'justfriends';
    const expected = { t: TERM, a: ACTION, o: ORIENT, data: {} };
    // Act
    const actual = new AppCtx(TERM, ACTION, ORIENT);
    // Assert
    expect(actual).toEqualOn(expected);
  });
});
