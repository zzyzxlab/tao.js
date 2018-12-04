import { normalizeAC, cleanInput } from '../src/helpers';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

describe('helpers provide functions used across the package', () => {
  describe('normalizeAC ensures an input AC object of any valid form is the same to work with', () => {
    it('always returns an AC object long form attributes', () => {
      // Assemble
      const expected = { term: void 0, action: void 0, orient: void 0 };
      // Act
      const actual = normalizeAC({});
      // Assert
      expect(actual).toHaveProperty('term', expected.term);
      expect(actual).toHaveProperty('action', expected.action);
      expect(actual).toHaveProperty('orient', expected.orient);
    });

    it('returns input AC from long form object', () => {
      // Assemble
      const expected = { term: TERM, action: ACTION, orient: ORIENT };
      // Act
      const actual = normalizeAC(expected);
      // Assert
      expect(actual).toHaveProperty('term', expected.term);
      expect(actual).toHaveProperty('action', expected.action);
      expect(actual).toHaveProperty('orient', expected.orient);
    });

    it('returns input AC from short form as long form object', () => {
      // Assemble
      const expected = { term: TERM, action: ACTION, orient: ORIENT };
      // Act
      const actual = normalizeAC({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      expect(actual).toHaveProperty('term', expected.term);
      expect(actual).toHaveProperty('action', expected.action);
      expect(actual).toHaveProperty('orient', expected.orient);
    });

    it('returns normalizes mised form input AC to long form object', () => {
      // Assemble
      const expected = { term: TERM, action: ACTION, orient: void 0 };
      // Act
      const actual = normalizeAC({ t: TERM, action: ACTION });
      // Assert
      expect(actual).toHaveProperty('term', expected.term);
      expect(actual).toHaveProperty('action', expected.action);
      expect(actual).toHaveProperty('orient', expected.orient);
    });
  });

  describe('cleanInput ensures missing attributes of an AC have missing attributes in an AC object', () => {
    it('should ignore short form AC attributes', () => {
      // Assemble
      const expected = {};
      // Act
      const actual = cleanInput({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      expect(actual).not.toHaveProperty('term');
      expect(actual).not.toHaveProperty('action');
      expect(actual).not.toHaveProperty('orient');
      expect(actual).not.toHaveProperty('t');
      expect(actual).not.toHaveProperty('a');
      expect(actual).not.toHaveProperty('o');
    });

    it('should preserve long form AC attributes with defined values', () => {
      // Assemble
      const expected = { term: TERM, action: ACTION, orient: ORIENT };
      // Act
      const actual = cleanInput(expected);
      // Assert
      expect(actual).toHaveProperty('term', expected.term);
      expect(actual).toHaveProperty('action', expected.action);
      expect(actual).toHaveProperty('orient', expected.orient);
    });

    it('should remove AC attributes which are null or undefined', () => {
      // Assemble
      const termWild = { term: TERM, action: null, orient: void 0 };
      const actionWild = { term: void 0, action: ACTION, orient: null };
      const orientWild = { term: null, action: void 0, orient: ORIENT };
      // Act
      const actualTerm = cleanInput(termWild);
      const actualAction = cleanInput(actionWild);
      const actualOrient = cleanInput(orientWild);
      // Assert
      expect(actualTerm).toHaveProperty('term', termWild.term);
      expect(actualTerm).not.toHaveProperty('action');
      expect(actualTerm).not.toHaveProperty('orient');

      expect(actualAction).not.toHaveProperty('term');
      expect(actualAction).toHaveProperty('action', actionWild.action);
      expect(actualAction).not.toHaveProperty('orient');

      expect(actualOrient).not.toHaveProperty('term');
      expect(actualOrient).not.toHaveProperty('action');
      expect(actualOrient).toHaveProperty('orient', orientWild.orient);
    });
  });
});
