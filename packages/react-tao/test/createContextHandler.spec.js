import util from 'util';
import React, { Component } from 'react';
import { mount } from 'enzyme';
import * as rtl from 'react-testing-library';
import TAO, { Kernel } from '@tao.js/core';
import Provider, { Context } from '../src/Provider';
import createContextHandler from '../src/createContextHandler';

describe('createContextHandler', () => {
  describe('is a higher order React component utility', () => {
    it('should be a Function', () => {
      expect(createContextHandler).toBeDefined();
      expect(createContextHandler).toBeInstanceOf(Function);
    });

    xit('should return a React Component when called', () => {
      // Arrange
      // Act
      const Actual = createContextHandler();
      // Assert
      expect(Actual).toBeDefined();
      expect(new Actual()).toBeInstanceOf(Actual);
      expect(new Actual()).not.toBeInstanceOf(Function);
      expect(new Actual()).toBeInstanceOf(Component);
    });
  });

  describe('consumes the outer/root Provider/Context', () => {
    // it('should ')
  });

  describe('provides a Context for developing React Components that use tao.js handlers', () => {
    it('should return an object with a Provider React Component', () => {
      // Arrange
      // Act
      const actual = createContextHandler();
      // Assert
      expect(actual.Provider).toBeDefined();
      expect(new actual.Provider()).toBeInstanceOf(actual.Provider);
      expect(new actual.Provider()).not.toBeInstanceOf(Function);
      expect(new actual.Provider()).toBeInstanceOf(Component);
    });

    xit('should return an object with a Consumer React Component', () => {
      // Arrange
      // Act
      const actual = createContextHandler();
      console.log(
        'Consumer:',
        util.inspect(actual.Consumer, { colors: true, depth: null })
      );
      // Assert
      expect(actual.Consumer).toBeDefined();
      // expect(new actual.Consumer()).toBeInstanceOf(actual.Consumer);
      // expect(new actual.Consumer()).not.toBeInstanceOf(Function);
      expect(new actual.Consumer()).toBeInstanceOf(Component);
    });
  });
});
