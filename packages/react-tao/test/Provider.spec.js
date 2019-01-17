import util from 'util';
import React, { Component } from 'react';
import { mount } from 'enzyme';
import * as rtl from 'react-testing-library';
import TAO, { Kernel } from '@tao.js/core';
import Provider, { Context } from '../src/Provider';

describe('Provider', () => {
  describe('is a React Provider', () => {
    afterEach(() => rtl.cleanup());

    const createConsumerChild = (ctxAssertions = () => {}) => {
      class ConsumerChild extends Component {
        render() {
          return (
            <Context.Consumer>
              {value => {
                ctxAssertions(value);
                return <div data-testid="tester">I'm here</div>;
              }}
            </Context.Consumer>
          );
        }
      }

      return ConsumerChild;
    };

    it('should provide a constructor that inherits from React.Component', () => {
      expect(Provider).toBeDefined();
      expect(new Provider()).toBeInstanceOf(Provider);
      expect(new Provider()).not.toBeInstanceOf(Function);
      expect(new Provider()).toBeInstanceOf(Component);
    });

    it('should not enforce a single child', () => {
      // Arrange
      const kernel = new Kernel();
      // Act
      // Assert
      expect(() => rtl.render(<Provider TAO={kernel} />)).not.toThrow();
      expect(() =>
        rtl.render(
          <Provider TAO={kernel}>
            <div />
          </Provider>
        )
      ).not.toThrow();
      expect(() =>
        rtl.render(
          <Provider TAO={kernel}>
            <div />
            <div />
            <div />
          </Provider>
        )
      ).not.toThrow();
    });

    it('should provide the tao.js Kernel from the TAO prop to consumers', () => {
      // Arrange
      const kernel = new Kernel();
      const Child = createConsumerChild(({ TAO }) => {
        // Assert
        expect(TAO).toBe(kernel);
      });
      // Act
      expect(() =>
        mount(
          // rtl.render(
          <Provider TAO={kernel}>
            <Child />
          </Provider>
        )
      ).not.toThrow();
    });

    it('should provide a function to set a data context', () => {
      // Arrange
      const kernel = new Kernel();
      const dataCtxKey = 'test';
      const dataCtxValue = { my: { other: 'self' } };
      const Child = createConsumerChild(({ setDataContext }) => {
        // Act
        // Assert
        expect(setDataContext).toBeDefined();
        expect(setDataContext).toBeInstanceOf(Function);
        expect(setDataContext).toHaveLength(2);
        expect(() => setDataContext(dataCtxKey, dataCtxValue)).not.toThrow();
      });
      // Trigger Assertions
      expect(() =>
        rtl.render(
          <Provider TAO={kernel}>
            <Child />
          </Provider>
        )
      ).not.toThrow();
    });

    it('should provide a function to get a data context', () => {
      // Arrange
      const kernel = new Kernel();
      const dataCtxKey = 'test';
      const dataCtxValue = { my: { other: 'self' } };
      const Child = createConsumerChild(
        ({ setDataContext, getDataContext }) => {
          // Act
          setDataContext(dataCtxKey, dataCtxValue);
          const actual = getDataContext(dataCtxKey);
          // Assert
          expect(getDataContext).toBeDefined();
          expect(getDataContext).toBeInstanceOf(Function);
          expect(getDataContext).toHaveLength(1);
          expect(actual).toBe(dataCtxValue);
        }
      );
      // Trigger Assertions
      expect(() =>
        rtl.render(
          <Provider TAO={kernel}>
            <Child />
          </Provider>
        )
      ).not.toThrow();
    });

    it('should allow changing the data context value', () => {
      // Arrange
      const kernel = new Kernel();
      const dataCtxKey = 'test';
      const dataCtxValue1 = { my: { other: 'self' } };
      const dataCtxValue2 = { my: { whole: 'self' } };
      const Child = createConsumerChild(
        ({ setDataContext, getDataContext }) => {
          // Act
          setDataContext(dataCtxKey, dataCtxValue1);
          const actual1 = getDataContext(dataCtxKey);
          setDataContext(dataCtxKey, dataCtxValue2);
          const actual2 = getDataContext(dataCtxKey);
          // Assert
          expect(actual1).toBe(dataCtxValue1);
          expect(actual2).toBe(dataCtxValue2);
        }
      );
      // Trigger Assertions
      expect(() =>
        rtl.render(
          <Provider TAO={kernel}>
            <Child />
          </Provider>
        )
      ).not.toThrow();
    });

    it('should allow setting multiple data contexts', () => {
      // Arrange
      const kernel = new Kernel();
      const dataCtxKey1 = 'test1';
      const dataCtxKey2 = 'test2';
      const dataCtxValue1 = { my: { other: 'self' } };
      const dataCtxValue2 = { my: { whole: 'self' } };
      const Child = createConsumerChild(
        ({ setDataContext, getDataContext }) => {
          // Act
          setDataContext(dataCtxKey1, dataCtxValue1);
          const actual1 = getDataContext(dataCtxKey1);
          setDataContext(dataCtxKey2, dataCtxValue2);
          const actual2 = getDataContext(dataCtxKey2);
          // Assert
          expect(actual1).toBe(dataCtxValue1);
          expect(actual2).toBe(dataCtxValue2);
        }
      );
      // Trigger Assertions
      expect(() =>
        rtl.render(
          <Provider TAO={kernel}>
            <Child />
          </Provider>
        )
      ).not.toThrow();
    });

    it('should provide a function to remove data contexts', () => {
      // Arrange
      const kernel = new Kernel();
      const dataCtxKey1 = 'test1';
      const dataCtxKey2 = 'test2';
      const dataCtxValue1 = { my: { other: 'self' } };
      const dataCtxValue2 = { my: { whole: 'self' } };
      const Child = createConsumerChild(
        ({ setDataContext, getDataContext, removeDataContext }) => {
          setDataContext(dataCtxKey1, dataCtxValue1);
          setDataContext(dataCtxKey2, dataCtxValue2);
          // Act
          removeDataContext(dataCtxKey1);
          const actual1 = getDataContext(dataCtxKey1);
          const actual2 = getDataContext(dataCtxKey2);
          // Assert
          expect(removeDataContext).toBeDefined();
          expect(removeDataContext).toBeInstanceOf(Function);
          expect(removeDataContext).toHaveLength(1);
          expect(actual1).toBeUndefined();
          expect(actual2).toBe(dataCtxValue2);
        }
      );
      // Trigger Assertions
      expect(() =>
        rtl.render(
          <Provider TAO={kernel}>
            <Child />
          </Provider>
        )
      ).not.toThrow();
    });

    it('should require one property called `TAO` that must be a Kernel', () => {
      // Arrange
      const kernel = new Kernel();
      const notKernel = 'call me maybe';
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      rtl.render(<Provider TAO={kernel} />);
      rtl.render(<Provider />);
      rtl.render(<Provider TAO={notKernel} />);

      // Assert
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        'Warning: Failed prop type: The prop `TAO` is marked as required in `Provider`, but its value is `undefined`.\n    in Provider'
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        'Warning: Failed prop type: Invalid prop `TAO` of type `String` supplied to `Provider`, expected instance of `Kernel`.\n    in Provider'
      );
      consoleSpy.mockRestore();
    });
  });
});

describe('Context', () => {
  it('should export a React.Context', () => {
    expect(Context).toBeDefined();
    // console.log('Context:', util.inspect(Context, { colors: true, depth: null }));
    expect(Context.Provider).toBeDefined();
    expect(Context.Provider._context).toBe(Context);
    expect(Context.Consumer).toBeDefined();
    expect(Context.Consumer._context).toBe(Context);
    expect(Context._currentValue).toBeDefined();
  });

  it('should have default value of default TAO', () => {
    expect(Context._currentValue.TAO).toBeDefined();
    expect(Context._currentValue.TAO).toBe(TAO);
  });

  it('should have default functions for working with DataContexts', () => {
    expect(Context._currentValue.setDataContext).toBeDefined();
    expect(Context._currentValue.setDataContext).toBeInstanceOf(Function);
    expect(Context._currentValue.getDataContext).toBeDefined();
    expect(Context._currentValue.getDataContext).toBeInstanceOf(Function);
    expect(Context._currentValue.removeDataContext).toBeDefined();
    expect(Context._currentValue.removeDataContext).toBeInstanceOf(Function);
  });
});
