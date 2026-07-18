import React, { Component } from 'react';
import { render, cleanup } from 'react-testing-library';
import { Kernel } from '@tao.js/core';
import Provider, { Context } from '../src/Provider';

describe('Provider', () => {
  afterEach(cleanup);

  const createConsumerChild = (ctxAssertions = () => {}) => {
    class ConsumerChild extends Component {
      render() {
        return (
          <Context.Consumer>
            {(value) => {
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
    const kernel = new Kernel();
    expect(() => render(<Provider TAO={kernel} />)).not.toThrow();
    expect(() =>
      render(
        <Provider TAO={kernel}>
          <div />
        </Provider>,
      ),
    ).not.toThrow();
    expect(() =>
      render(
        <Provider TAO={kernel}>
          <div />
          <div />
          <div />
        </Provider>,
      ),
    ).not.toThrow();
  });

  it('should provide the tao.js Kernel from the TAO prop to consumers', () => {
    const kernel = new Kernel();
    const Child = createConsumerChild(({ TAO }) => {
      expect(TAO).toBe(kernel);
    });
    expect(() =>
      render(
        <Provider TAO={kernel}>
          <Child />
        </Provider>,
      ),
    ).not.toThrow();
  });

  it('should provide an empty data bag for named DataHandler contexts', () => {
    const kernel = new Kernel();
    const Child = createConsumerChild(({ data }) => {
      expect(data).toEqual({});
    });
    render(
      <Provider TAO={kernel}>
        <Child />
      </Provider>,
    );
  });

  it('should expose TAO and data on the default Context value', () => {
    expect(Context._currentValue.TAO).toBeDefined();
    expect(Context._currentValue.data).toEqual({});
  });
});
