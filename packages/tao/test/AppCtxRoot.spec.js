import { WILDCARD } from '../build/constants';
import AppCtxRoot from '../build/AppCtxRoot';

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

describe('AppCtxRoot defines a way to index AppCtxRoot instances by a consistent key', () => {
  it('should define a static function to get a key', () => {
    expect(AppCtxRoot.getKey).toBeDefined();
    expect(typeof AppCtxRoot.getKey).toBe('function');
  });

  it('should return keys as a string', () => {
    expect(typeof AppCtxRoot.getKey()).toBe('string');
  });

  it('should define a static function to get a key that is always the same', () => {
    // Assemble
    const expected = AppCtxRoot.getKey(TERM, ACTION, ORIENT);
    // Act
    const actual = AppCtxRoot.getKey(TERM, ACTION, ORIENT);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should define an instance method to get the same key for an AppCtxRoot instance', () => {
    // Assemble
    const expected = AppCtxRoot.getKey(TERM, ACTION, ORIENT);
    const uut = new AppCtxRoot(TERM, ACTION, ORIENT);
    // Act
    const actual = uut.key;
    // Assert
    expect(actual).toBe(expected);
  });

  it('should provide the same key for 2 instances of AppCtxRoot with same TAOs', () => {
    // Assemble
    const expected = new AppCtxRoot(TERM, ACTION, ORIENT);
    // Act
    const actual = new AppCtxRoot(TERM, ACTION, ORIENT);
    // Assert
    expect(actual.key).toBe(expected.key);
  });

  it('should match keys for all wildcard TAOs', () => {
    // Assemble
    const expectedKey = AppCtxRoot.getKey(WILDCARD, WILDCARD, WILDCARD);
    const implicitWildcards = new AppCtxRoot();
    const explicitWildcards = new AppCtxRoot(WILDCARD, WILDCARD, WILDCARD);
    const emptyWildcards = new AppCtxRoot('', '', '');
    // Act
    // Assert
    expect(implicitWildcards.key).toBe(expectedKey);
    expect(explicitWildcards.key).toBe(expectedKey);
    expect(emptyWildcards.key).toBe(expectedKey);
  });
});

describe('AppCtxRoot defines static methods for checking TAO values', () => {
  it('should define a static isWildcard function that returns a boolean value', () => {
    expect(AppCtxRoot.isWildcard).toBeDefined();
    expect(typeof AppCtxRoot.isWildcard).toBe('function');
    expect(typeof AppCtxRoot.isWildcard()).toBe('boolean');
  });

  it('should define a static isConcrete function that returns a boolean value', () => {
    expect(AppCtxRoot.isConcrete).toBeDefined();
    expect(typeof AppCtxRoot.isConcrete).toBe('function');
    expect(typeof AppCtxRoot.isConcrete()).toBe('boolean');
  });

  it('should return true from isWildcard if any TAO is not specifically defined', () => {
    // Assemble
    const wildTerm = {
      t: WILDCARD,
      a: ACTION,
      o: ORIENT
    };
    const wildAction = {
      term: TERM,
      //action: undefined,
      orient: ORIENT
    };
    const wildOrient = {
      t: TERM,
      action: ACTION,
      orient: ''
    };
    // Act
    // Assert
    expect(AppCtxRoot.isWildcard(wildTerm)).toBe(true);
    expect(AppCtxRoot.isWildcard(wildAction)).toBe(true);
    expect(AppCtxRoot.isWildcard(wildOrient)).toBe(true);
  });

  it('should return false from isConcrete if any TAO is not specifically defined', () => {
    // Assemble
    const wildTerm = {
      t: WILDCARD,
      a: ACTION,
      o: ORIENT
    };
    const wildAction = {
      term: TERM,
      orient: ORIENT
    };
    const wildOrient = {
      t: TERM,
      action: ACTION,
      orient: ''
    };
    // Act
    // Assert
    expect(AppCtxRoot.isConcrete(wildTerm)).toBe(false);
    expect(AppCtxRoot.isConcrete(wildAction)).toBe(false);
    expect(AppCtxRoot.isConcrete(wildOrient)).toBe(false);
  });

  it('should return false from isWildcard if all TAOs are specifically defined', () => {
    // Assemble
    const concreteAC1 = {
      t: TERM,
      a: ACTION,
      o: ORIENT
    };
    const concreteAC2 = {
      term: TERM,
      action: ACTION,
      orient: ORIENT
    };
    const concreteAC3 = {
      t: TERM,
      action: ACTION,
      o: ORIENT
    };
    // Act
    // Assert
    expect(AppCtxRoot.isWildcard(concreteAC1)).toBe(false);
    expect(AppCtxRoot.isWildcard(concreteAC2)).toBe(false);
    expect(AppCtxRoot.isWildcard(concreteAC3)).toBe(false);
  });

  it('should return true from isConcrete if all TAOs are specifically defined', () => {
    // Assemble
    const concreteAC1 = {
      t: TERM,
      a: ACTION,
      o: ORIENT
    };
    const concreteAC2 = {
      term: TERM,
      action: ACTION,
      orient: ORIENT
    };
    const concreteAC3 = {
      t: TERM,
      action: ACTION,
      o: ORIENT
    };
    // Act
    // Assert
    expect(AppCtxRoot.isConcrete(concreteAC1)).toBe(true);
    expect(AppCtxRoot.isConcrete(concreteAC2)).toBe(true);
    expect(AppCtxRoot.isConcrete(concreteAC3)).toBe(true);
  });
});
