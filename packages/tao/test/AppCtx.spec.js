import { WILDCARD } from '../lib/constants';
import AppCtxRoot from '../lib/AppCtxRoot';
import AppCtx from '../lib/AppCtx';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

/**
 * Passing this test means it inherits the tests from AppCtxRoot
 */
describe('AppCtx exports a class extending AppCtxRoot', () => {
  it('should provide a constructor', () => {
    // Assemble
    // Act
    // Assert
    expect(AppCtx).toBeDefined();
    expect(new AppCtx()).toBeInstanceOf(AppCtx);
    expect(new AppCtx()).not.toBeInstanceOf(Function);
  });

  it('should inherit from AppCtxRoot', () => {
    // Assemble
    // Act
    // Assert
    expect(new AppCtx()).toBeInstanceOf(AppCtxRoot);
  });

  it('should call super() in constructor', () => {
    // Assemble
    const expected = new AppCtxRoot();
    // Act
    const actual = new AppCtx();
    // Assert
    expect(actual).toEqualOn(expected);
  });
});

describe('AppCtx can be unwrapped to a bare TAO App Context', () => {
  it('should have an unwrapCtx function returning an object of the form { t, a, o } that can be used with other APIs', () => {
    // Assemble
    const uut = new AppCtx(TERM, ACTION, ORIENT);
    // Act
    const unwrapped = uut.unwrapCtx();
    // Assert
    expect(unwrapped).toMatchObject({
      t: TERM,
      a: ACTION,
      o: ORIENT
    });
  });
});

describe('AppCtx adds data in order to define concrete Application Contexts during execution', () => {
  it('should create an AppCtx with empty data', () => {
    // Assemble
    const expected = {
      t: WILDCARD,
      a: WILDCARD,
      o: WILDCARD,
      data: {}
    };
    // Act
    const actual = new AppCtx();
    // Assert
    expect(actual).toEqualOn(expected);
  });

  describe('AppCtx can receive an array as the data parameter', () => {
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
  });

  describe('AppCtx can receive an object as the data parameter', () => {
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

    it('should accept data as an object with keys t, a, o for the Context', () => {
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
        t: expectedTermData,
        a: expectedActionData,
        o: expectedOrientData
      });
      // Assert
      expect(actual).toEqualOn(expected);
    });
  });

  describe('AppCtx can receive a list of args for the data parameter', () => {
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

    it('should accept data as a single value arg for the Term', () => {
      // Assemble
      const expectedTermData = 'awesome sauce';
      const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
      const expected = {
        ...expectedTao,
        data: {
          [TERM]: expectedTermData
        }
      };
      // Act
      const actual = new AppCtx(TERM, ACTION, ORIENT, expectedTermData);
      // Assert
      expect(actual).toEqualOn(expected);
    });

    it('should accept data in the 2nd position as a single object for the Action', () => {
      // Assemble
      const expectedActionData = {
        a: 'thing'
      };
      const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
      const expected = {
        ...expectedTao,
        data: {
          [ACTION]: {
            ...expectedActionData
          }
        }
      };
      // Act
      const actual = new AppCtx(
        TERM,
        ACTION,
        ORIENT,
        undefined,
        expectedActionData
      );
      // Assert
      expect(actual).toEqualOn(expected);
    });

    it('should accept data in the 2nd position as a value for the Action', () => {
      // Assemble
      const expectedActionData = 99.99966;
      const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
      const expected = {
        ...expectedTao,
        data: {
          [ACTION]: expectedActionData
        }
      };
      // Act
      const actual = new AppCtx(
        TERM,
        ACTION,
        ORIENT,
        undefined,
        expectedActionData
      );
      // Assert
      expect(actual).toEqualOn(expected);
    });

    it('should accept data in the 3rd position as a single object for the Orient', () => {
      // Assemble
      const expectedOrientData = {
        token: 'qwertyuiop'
      };
      const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
      const expected = {
        ...expectedTao,
        data: {
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
        null,
        undefined,
        expectedOrientData
      );
      // Assert
      expect(actual).toEqualOn(expected);
    });

    it('should accept data in the 3rd position as a value for the Orient', () => {
      // Assemble
      const expectedOrientData = Date.now();
      const expectedTao = { t: TERM, a: ACTION, o: ORIENT };
      const expected = {
        ...expectedTao,
        data: {
          [ORIENT]: expectedOrientData
        }
      };
      // Act
      const actual = new AppCtx(
        TERM,
        ACTION,
        ORIENT,
        null,
        undefined,
        expectedOrientData
      );
      // Assert
      expect(actual).toEqualOn(expected);
    });

    it('should accept data as a set of args for the Context by position', () => {
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
});
