import { WILDCARD } from './constants';
import AppCtx from './AppCtx';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';
const DEFAULT_DATA = {};

describe('AppCtx should hold a tao App Context', () => {
  it('should create an empty AppCtx', () => {
    // Assemble
    const expected = {
      t: WILDCARD,
      a: WILDCARD,
      o: WILDCARD,
      data: DEFAULT_DATA
    };
    // Act
    const actual = new AppCtx();
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should create a concrete AppCtx', () => {
    // Assemble
    const expected = { t: TERM, a: ACTION, o: ORIENT, data: DEFAULT_DATA };
    // Act
    const actual = new AppCtx(TERM, ACTION, ORIENT);
    // Assert
    expect(actual).toEqualOn(expected);
    expect(actual.isConcrete).toBe(true);
    expect(actual.isTermWild).toBe(false);
    expect(actual.isActionWild).toBe(false);
    expect(actual.isOrientWild).toBe(false);
  });

  it('should create partial AppCtx as Wildcard', () => {
    // Assemble
    const expectedTerm = {
      t: TERM,
      a: WILDCARD,
      o: WILDCARD,
      data: DEFAULT_DATA
    };
    const expectedAction = {
      t: WILDCARD,
      a: ACTION,
      o: WILDCARD,
      data: DEFAULT_DATA
    };
    const expectedOrient = {
      t: WILDCARD,
      a: WILDCARD,
      o: ORIENT,
      data: DEFAULT_DATA
    };
    // Act
    const actualTerm = new AppCtx(TERM);
    const actualAction = new AppCtx('', ACTION);
    const actualOrient = new AppCtx(null, null, ORIENT);
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

  it('should accept data as a single item array for the Term', () => {
    // Assemble
    const expectedTermData = {
      id: 1234567,
      name: 'My Name',
      other: { thing: 'below ' }
    };
    const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
    const expected = {
      ...expectedTao,
      data: {
        [TERM]: {
          ...expectedTermData
        }
      }
    };
    // Act
    const actual = new AppCtx(TERM, ACTION, ORIENT, [expectedTermData]);
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should accept data as a single object for the Term', () => {
    // Assemble
    const expectedTermData = {
      id: 1234567,
      name: 'My Name',
      other: { thing: 'below ' }
    };
    const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
    const expected = {
      ...expectedTao,
      data: {
        [TERM]: {
          ...expectedTermData
        }
      }
    };
    // Act
    const actual = new AppCtx(TERM, ACTION, ORIENT, expectedTermData);
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should accept data as an array tuple for the Context to be assigned by position', () => {
    // Assemble
    const expectedTermData = {
      id: 1234567,
      name: 'My Name',
      other: { thing: 'below ' }
    };
    const expectedActionData = {
      a: 'thing'
    };
    const expectedOrientData = {
      token: 'qwertyuiop'
    };
    const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
    const expected = {
      ...expectedTao,
      data: {
        [TERM]: {
          ...expectedTermData
        },
        [ACTION]: {
          ...expectedActionData
        },
        [ORIENT]: {
          ...expectedOrientData
        }
      }
    };
    // Act
    const actual = new AppCtx(TERM, ACTION, ORIENT, [
      expectedTermData,
      expectedActionData,
      expectedOrientData
    ]);
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should accept data as an object with keys of the tao for the Context', () => {
    // Assemble
    const expectedTermData = {
      id: 1234567,
      name: 'My Name',
      other: { thing: 'below ' }
    };
    const expectedActionData = {
      a: 'thing'
    };
    const expectedOrientData = {
      token: 'qwertyuiop'
    };
    const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
    const expected = {
      ...expectedTao,
      data: {
        [TERM]: {
          ...expectedTermData
        },
        [ACTION]: {
          ...expectedActionData
        },
        [ORIENT]: {
          ...expectedOrientData
        }
      }
    };
    // Act
    const actual = new AppCtx(TERM, ACTION, ORIENT, {
      [TERM]: expectedTermData,
      [ACTION]: expectedActionData,
      [ORIENT]: expectedOrientData
    });
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should accept data as an object with keys term, action, orient for the Context', () => {
    // Assemble
    const expectedTermData = {
      id: 1234567,
      name: 'My Name',
      other: { thing: 'below ' }
    };
    const expectedActionData = {
      a: 'thing'
    };
    const expectedOrientData = {
      token: 'qwertyuiop'
    };
    const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
    const expected = {
      ...expectedTao,
      data: {
        [TERM]: {
          ...expectedTermData
        },
        [ACTION]: {
          ...expectedActionData
        },
        [ORIENT]: {
          ...expectedOrientData
        }
      }
    };
    // Act
    const actual = new AppCtx(TERM, ACTION, ORIENT, {
      term: expectedTermData,
      action: expectedActionData,
      orient: expectedOrientData
    });
    // Assert
    expect(actual).toEqualOn(expected);
  });

  it('should accept data as an set of args for the Context by position', () => {
    // Assemble
    const expectedTermData = {
      id: 1234567,
      name: 'My Name',
      other: { thing: 'below ' }
    };
    const expectedActionData = {
      a: 'thing'
    };
    const expectedOrientData = {
      token: 'qwertyuiop'
    };
    const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
    const expected = {
      ...expectedTao,
      data: {
        [TERM]: {
          ...expectedTermData
        },
        [ACTION]: {
          ...expectedActionData
        },
        [ORIENT]: {
          ...expectedOrientData
        }
      }
    };
    // Act
    const actual = new AppCtx(
      TERM,
      ACTION,
      ORIENT,
      expectedTermData,
      expectedActionData,
      expectedOrientData
    );
    // Assert
    expect(actual).toEqualOn(expected);
  });
});
