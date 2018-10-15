import { WILDCARD } from '../lib/constants';
import AppCtxRoot from '../lib/AppCtxRoot';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

const ALT_TERM = 'dude';
const ALT_ACTION = 'fistbump';
const ALT_ORIENT = 'bros';

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

describe('AppCtxRoot defines methods to allow library writers to test matching', () => {
  describe('using a static isMatch method', () => {
    it('should match the same trigram', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = new AppCtxRoot(TERM, ACTION, ORIENT);
      // Act
      const match12 = AppCtxRoot.isMatch(ac1, ac2);
      const match21 = AppCtxRoot.isMatch(ac2, ac1);
      // Assert
      expect(match12).toBe(true);
      expect(match21).toBe(true);
    });

    it('should not match trigrams that differ on any attribute', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = new AppCtxRoot(ALT_TERM, ACTION, ORIENT);
      const ac3 = new AppCtxRoot(TERM, ALT_ACTION, ORIENT);
      const ac4 = new AppCtxRoot(TERM, ACTION, ALT_ORIENT);
      // Act
      const matched12 = AppCtxRoot.isMatch(ac1, ac2);
      const matched13 = AppCtxRoot.isMatch(ac1, ac3);
      const matched14 = AppCtxRoot.isMatch(ac1, ac4);
      const matched21 = AppCtxRoot.isMatch(ac2, ac1);
      const matched31 = AppCtxRoot.isMatch(ac3, ac1);
      const matched41 = AppCtxRoot.isMatch(ac4, ac1);
      // Assert
      expect(matched12).toBe(false);
      expect(matched13).toBe(false);
      expect(matched14).toBe(false);
      expect(matched21).toBe(false);
      expect(matched31).toBe(false);
      expect(matched41).toBe(false);
    });

    it('should match trigrams that differ on wildcard attributes', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = new AppCtxRoot('', ACTION, ORIENT);
      const ac3 = new AppCtxRoot(TERM, null, ORIENT);
      const ac4 = new AppCtxRoot(TERM, ACTION, WILDCARD);
      // Act
      const matched12 = AppCtxRoot.isMatch(ac1, ac2);
      const matched13 = AppCtxRoot.isMatch(ac1, ac3);
      const matched14 = AppCtxRoot.isMatch(ac1, ac4);
      const matched21 = AppCtxRoot.isMatch(ac2, ac1);
      const matched31 = AppCtxRoot.isMatch(ac3, ac1);
      const matched41 = AppCtxRoot.isMatch(ac4, ac1);
      // Assert
      expect(matched12).toBe(true);
      expect(matched13).toBe(true);
      expect(matched14).toBe(true);
      expect(matched21).toBe(true);
      expect(matched31).toBe(true);
      expect(matched41).toBe(true);
    });

    it('should work the same if second trigram is not an instance of AppCtxRoot', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = { t: TERM, a: ACTION, o: ORIENT };
      const ac3 = { t: ALT_TERM, a: ACTION, o: ORIENT };
      const ac4 = { t: TERM, a: ALT_ACTION, o: ORIENT };
      const ac5 = { t: TERM, a: ACTION, o: ALT_ORIENT };
      const ac6 = { a: ACTION, o: ORIENT };
      const ac7 = { t: TERM, a: '', o: ORIENT };
      const ac8 = { t: TERM, a: ACTION };
      // Act
      const match12 = AppCtxRoot.isMatch(ac1, ac2);
      const match21 = AppCtxRoot.isMatch(ac2, ac1);
      const notMatch13 = AppCtxRoot.isMatch(ac1, ac3);
      const notMatch14 = AppCtxRoot.isMatch(ac1, ac4);
      const notMatch15 = AppCtxRoot.isMatch(ac1, ac5);
      const match16 = AppCtxRoot.isMatch(ac1, ac6);
      const match17 = AppCtxRoot.isMatch(ac1, ac7);
      const match18 = AppCtxRoot.isMatch(ac1, ac8);
      // Assert
      expect(match12).toBe(true);
      expect(match21).toBe(true);
      expect(notMatch13).toBe(false);
      expect(notMatch14).toBe(false);
      expect(notMatch15).toBe(false);
      expect(match16).toBe(true);
      expect(match17).toBe(true);
      expect(match18).toBe(true);
    });

    it('should work the same if both trigrams are not instances of AppCtxRoot', () => {
      // Assemble
      const ac1 = { t: TERM, a: ACTION, o: ORIENT };
      const ac2 = { t: TERM, a: ACTION, o: ORIENT };
      const ac3 = { t: ALT_TERM, a: ACTION, o: ORIENT };
      const ac4 = { t: TERM, a: ALT_ACTION, o: ORIENT };
      const ac5 = { t: TERM, a: ACTION, o: ALT_ORIENT };
      const ac6 = { a: ACTION, o: ORIENT };
      const ac7 = { t: TERM, a: '', o: ORIENT };
      const ac8 = { t: TERM, a: ACTION };
      // Act
      const match12 = AppCtxRoot.isMatch(ac1, ac2);
      const match21 = AppCtxRoot.isMatch(ac2, ac1);
      const notMatch13 = AppCtxRoot.isMatch(ac1, ac3);
      const notMatch14 = AppCtxRoot.isMatch(ac1, ac4);
      const notMatch15 = AppCtxRoot.isMatch(ac1, ac5);
      const notMatch31 = AppCtxRoot.isMatch(ac3, ac1);
      const notMatch41 = AppCtxRoot.isMatch(ac4, ac1);
      const notMatch51 = AppCtxRoot.isMatch(ac5, ac1);
      const match16 = AppCtxRoot.isMatch(ac1, ac6);
      const match17 = AppCtxRoot.isMatch(ac1, ac7);
      const match18 = AppCtxRoot.isMatch(ac1, ac8);
      const match61 = AppCtxRoot.isMatch(ac6, ac1);
      const match71 = AppCtxRoot.isMatch(ac7, ac1);
      const match81 = AppCtxRoot.isMatch(ac8, ac1);
      // Assert
      expect(match12).toBe(true);
      expect(match21).toBe(true);
      expect(notMatch13).toBe(false);
      expect(notMatch14).toBe(false);
      expect(notMatch15).toBe(false);
      expect(notMatch31).toBe(false);
      expect(notMatch41).toBe(false);
      expect(notMatch51).toBe(false);
      expect(match16).toBe(true);
      expect(match17).toBe(true);
      expect(match18).toBe(true);
      expect(match61).toBe(true);
      expect(match71).toBe(true);
      expect(match81).toBe(true);
    });
  });

  describe('using a static isMatch method with `exact` parameter', () => {
    it('should match the same trigram', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = new AppCtxRoot(TERM, ACTION, ORIENT);
      // Act
      const match12 = AppCtxRoot.isMatch(ac1, ac2, true);
      const match21 = AppCtxRoot.isMatch(ac2, ac1, true);
      // Assert
      expect(match12).toBe(true);
      expect(match21).toBe(true);
    });

    it('should not match trigrams that differ on any attribute', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = new AppCtxRoot(ALT_TERM, ACTION, ORIENT);
      const ac3 = new AppCtxRoot(TERM, ALT_ACTION, ORIENT);
      const ac4 = new AppCtxRoot(TERM, ACTION, ALT_ORIENT);
      // Act
      const matched12 = AppCtxRoot.isMatch(ac1, ac2, true);
      const matched13 = AppCtxRoot.isMatch(ac1, ac3, true);
      const matched14 = AppCtxRoot.isMatch(ac1, ac4, true);
      const matched21 = AppCtxRoot.isMatch(ac2, ac1, true);
      const matched31 = AppCtxRoot.isMatch(ac3, ac1, true);
      const matched41 = AppCtxRoot.isMatch(ac4, ac1, true);
      // Assert
      expect(matched12).toBe(false);
      expect(matched13).toBe(false);
      expect(matched14).toBe(false);
      expect(matched21).toBe(false);
      expect(matched31).toBe(false);
      expect(matched41).toBe(false);
    });

    it('should NOT match trigrams that differ on wildcard attributes', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = new AppCtxRoot('', ACTION, ORIENT);
      const ac3 = new AppCtxRoot(TERM, null, ORIENT);
      const ac4 = new AppCtxRoot(TERM, ACTION, WILDCARD);
      // Act
      const matched12 = AppCtxRoot.isMatch(ac1, ac2, true);
      const matched13 = AppCtxRoot.isMatch(ac1, ac3, true);
      const matched14 = AppCtxRoot.isMatch(ac1, ac4, true);
      const matched21 = AppCtxRoot.isMatch(ac2, ac1, true);
      const matched31 = AppCtxRoot.isMatch(ac3, ac1, true);
      const matched41 = AppCtxRoot.isMatch(ac4, ac1, true);
      // Assert
      expect(matched12).toBe(false);
      expect(matched13).toBe(false);
      expect(matched14).toBe(false);
      expect(matched21).toBe(false);
      expect(matched31).toBe(false);
      expect(matched41).toBe(false);
    });

    it('should work the same if second trigram is not an instance of AppCtxRoot', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = { t: TERM, a: ACTION, o: ORIENT };
      const ac3 = { t: ALT_TERM, a: ACTION, o: ORIENT };
      const ac4 = { t: TERM, a: ALT_ACTION, o: ORIENT };
      const ac5 = { t: TERM, a: ACTION, o: ALT_ORIENT };
      const ac6 = { a: ACTION, o: ORIENT };
      const ac7 = { t: TERM, a: '', o: ORIENT };
      const ac8 = { t: TERM, a: ACTION };
      // Act
      const match12 = AppCtxRoot.isMatch(ac1, ac2, true);
      const match21 = AppCtxRoot.isMatch(ac2, ac1, true);
      const notMatch13 = AppCtxRoot.isMatch(ac1, ac3, true);
      const notMatch14 = AppCtxRoot.isMatch(ac1, ac4, true);
      const notMatch15 = AppCtxRoot.isMatch(ac1, ac5, true);
      const notMatch16 = AppCtxRoot.isMatch(ac1, ac6, true);
      const notMatch17 = AppCtxRoot.isMatch(ac1, ac7, true);
      const notMatch18 = AppCtxRoot.isMatch(ac1, ac8, true);
      // Assert
      expect(match12).toBe(true);
      expect(match21).toBe(true);
      expect(notMatch13).toBe(false);
      expect(notMatch14).toBe(false);
      expect(notMatch15).toBe(false);
      expect(notMatch16).toBe(false);
      expect(notMatch17).toBe(false);
      expect(notMatch18).toBe(false);
    });

    it('should work the same if both trigrams are not instances of AppCtxRoot', () => {
      // Assemble
      const ac1 = { t: TERM, a: ACTION, o: ORIENT };
      const ac2 = { t: TERM, a: ACTION, o: ORIENT };
      const ac3 = { t: ALT_TERM, a: ACTION, o: ORIENT };
      const ac4 = { t: TERM, a: ALT_ACTION, o: ORIENT };
      const ac5 = { t: TERM, a: ACTION, o: ALT_ORIENT };
      const ac6 = { a: ACTION, o: ORIENT };
      const ac7 = { t: TERM, a: '', o: ORIENT };
      const ac8 = { t: TERM, a: ACTION };
      // Act
      const match12 = AppCtxRoot.isMatch(ac1, ac2, true);
      const match21 = AppCtxRoot.isMatch(ac2, ac1, true);
      const notMatch13 = AppCtxRoot.isMatch(ac1, ac3, true);
      const notMatch14 = AppCtxRoot.isMatch(ac1, ac4, true);
      const notMatch15 = AppCtxRoot.isMatch(ac1, ac5, true);
      const notMatch31 = AppCtxRoot.isMatch(ac3, ac1, true);
      const notMatch41 = AppCtxRoot.isMatch(ac4, ac1, true);
      const notMatch51 = AppCtxRoot.isMatch(ac5, ac1, true);
      const noMatch16 = AppCtxRoot.isMatch(ac1, ac6, true);
      const noMatch17 = AppCtxRoot.isMatch(ac1, ac7, true);
      const noMatch18 = AppCtxRoot.isMatch(ac1, ac8, true);
      const noMatch61 = AppCtxRoot.isMatch(ac6, ac1, true);
      const noMatch71 = AppCtxRoot.isMatch(ac7, ac1, true);
      const noMatch81 = AppCtxRoot.isMatch(ac8, ac1, true);
      // Assert
      expect(match12).toBe(true);
      expect(match21).toBe(true);
      expect(notMatch13).toBe(false);
      expect(notMatch14).toBe(false);
      expect(notMatch15).toBe(false);
      expect(notMatch31).toBe(false);
      expect(notMatch41).toBe(false);
      expect(notMatch51).toBe(false);
      expect(noMatch16).toBe(false);
      expect(noMatch17).toBe(false);
      expect(noMatch18).toBe(false);
      expect(noMatch61).toBe(false);
      expect(noMatch71).toBe(false);
      expect(noMatch81).toBe(false);
    });
  });

  describe('using an instance isMatch method that delegates to the static version', () => {
    it('should call static isMatch with itself as the first arg', () => {
      // Assemble
      const ac1 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac2 = new AppCtxRoot(TERM, ACTION, ORIENT);
      const ac3 = { t: TERM, a: ACTION, o: ORIENT };
      const staticSpy = jest.spyOn(AppCtxRoot, 'isMatch');
      // Act
      ac1.isMatch(ac2);
      ac1.isMatch(ac2, true);
      ac1.isMatch(ac3);
      ac1.isMatch(ac3, true);
      // Assert
      expect(staticSpy).toHaveBeenCalledTimes(4);
      expect(staticSpy).toHaveBeenNthCalledWith(1, ac1, ac2, false);
      expect(staticSpy).toHaveBeenNthCalledWith(2, ac1, ac2, true);
      expect(staticSpy).toHaveBeenNthCalledWith(3, ac1, ac3, false);
      expect(staticSpy).toHaveBeenNthCalledWith(4, ac1, ac3, true);
      // restore
      staticSpy.mockRestore();
    });
  });
});
