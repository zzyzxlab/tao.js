import { isIterable } from '../src/utils';

describe('isIterable tests whether a value can be iterated as a collection', () => {
  it('should return false for null', () => {
    // Assemble
    const expected = false;
    const toTest = null;
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for undefined', () => {
    // Assemble
    const expected = false;
    const toTest = undefined;
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for string', () => {
    // Assemble
    const expected = false;
    const toTest = 'string to test';
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for numbers', () => {
    // Assemble
    const expected = false;
    const toTest = 8.97;
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for boolean', () => {
    // Assemble
    const expected = false;
    const toTest = true;
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for Object', () => {
    // Assemble
    const expected = false;
    const toTest = {};
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for Symbol', () => {
    // Assemble
    const expected = false;
    const toTest = Symbol('mang');
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for Date', () => {
    // Assemble
    const expected = false;
    const toTest = Date.now();
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return true for Array', () => {
    // Assemble
    const expected = true;
    const toTest = [];
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return true for typed Arrays', () => {
    // Assemble
    const expected = true;
    const toTest = new Int16Array();
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return true for Maps', () => {
    // Assemble
    const expected = true;
    const toTest = new Map();
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for WeakMaps', () => {
    // Assemble
    const expected = false;
    const toTest = new WeakMap();
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return true for Sets', () => {
    // Assemble
    const expected = true;
    const toTest = new Set();
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });

  it('should return false for WeakSets', () => {
    // Assemble
    const expected = false;
    const toTest = new WeakSet();
    // Act
    const actual = isIterable(toTest);
    // Assert
    expect(actual).toBe(expected);
  });
});
