import React, { Component } from 'react';
import createContextHandler from '../src/createContextHandler';

describe('createContextHandler', () => {
  describe('is a higher order React component utility', () => {
    it('should be a Function', () => {
      expect(createContextHandler).toBeDefined();
      expect(createContextHandler).toBeInstanceOf(Function);
    });

    it('should return a Provider/Consumer pair when called', () => {
      const actual = createContextHandler();

      expect(actual).toBeDefined();
      expect(actual).toEqual(
        expect.objectContaining({
          Provider: expect.any(Function),
          Consumer: expect.any(Object),
        }),
      );
    });
  });

  describe('provides a Context for developing React Components that use tao.js handlers', () => {
    it('should return an object with a Provider React Component', () => {
      const actual = createContextHandler();

      expect(actual.Provider).toBeDefined();
      expect(new actual.Provider()).toBeInstanceOf(actual.Provider);
      expect(new actual.Provider()).not.toBeInstanceOf(Function);
      expect(new actual.Provider()).toBeInstanceOf(Component);
    });

    it('should return an object with a Consumer', () => {
      const actual = createContextHandler();

      expect(actual.Consumer).toBeDefined();
      // React context Consumer is not a class component; it is usable as JSX
      expect(
        typeof actual.Consumer === 'object' ||
          typeof actual.Consumer === 'function',
      ).toBe(true);
      expect(<actual.Consumer>{() => null}</actual.Consumer>).toBeTruthy();
    });
  });
});
