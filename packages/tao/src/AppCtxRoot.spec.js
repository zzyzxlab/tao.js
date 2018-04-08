import { WILDCARD } from './constants';
import AppCtxRoot from './AppCtxRoot';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

describe('AppCtxRoot exports a class', () => {
  it('should be defined', () => {
    // Assemble
    // Act
    // Assert
    expect(AppCtxRoot).toBeDefined();
  });

  it('should provide a constructor', () => {
    // Assemble
    // Act
    // Assert
    expect(new AppCtxRoot()).toBeInstanceOf(AppCtxRoot);
    expect(new AppCtxRoot()).not.toBeInstanceOf(Function);
  });
});

describe('AppCtxRoot holds a tao (term, action, orient) App Context', () => {
  it('should create an empty AppCtxRoot', () => {
    // Assemble
    const expected = {
      t: WILDCARD,
      a: WILDCARD,
      o: WILDCARD
    };
    // Act
    const actual = new AppCtxRoot();
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should create a concrete AppCtxRoot', () => {
    // Assemble
    const expected = { t: TERM, a: ACTION, o: ORIENT };
    // Act
    const actual = new AppCtxRoot(TERM, ACTION, ORIENT);
    // Assert
    expect(actual).toEqualOn(expected);
    expect(actual.isConcrete).toBe(true);
    expect(actual.isTermWild).toBe(false);
    expect(actual.isActionWild).toBe(false);
    expect(actual.isOrientWild).toBe(false);
  });

  it('should create partial AppCtxRoot as Wildcard', () => {
    // Assemble
    const expectedTerm = {
      t: TERM,
      a: WILDCARD,
      o: WILDCARD
    };
    const expectedAction = {
      t: WILDCARD,
      a: ACTION,
      o: WILDCARD
    };
    const expectedOrient = {
      t: WILDCARD,
      a: WILDCARD,
      o: ORIENT
    };
    // Act
    const actualTerm = new AppCtxRoot(TERM);
    const actualAction = new AppCtxRoot('', ACTION);
    const actualOrient = new AppCtxRoot(null, null, ORIENT);
    // Assert
    expect(actualTerm).toEqualOn(expectedTerm);
    expect(actualTerm.isWildcard).toBe(true);
    expect(actualTerm.isActionWild).toBe(true);
    expect(actualTerm.isOrientWild).toBe(true);
    expect(actualAction).toEqualOn(expectedAction);
    expect(actualAction.isWildcard).toBe(true);
    expect(actualAction.isTermWild).toBe(true);
    expect(actualAction.isOrientWild).toBe(true);
    expect(actualOrient).toEqualOn(expectedOrient);
    expect(actualOrient.isWildcard).toBe(true);
    expect(actualOrient.isTermWild).toBe(true);
    expect(actualOrient.isActionWild).toBe(true);
  });
});
