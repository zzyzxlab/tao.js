import React, { Component } from 'react';
// Component still used by createConsumerChild class below
import { render, cleanup, renderHook } from '@testing-library/react';
import { Kernel } from '@tao.js/core';
import TaoProvider, { Context } from '../src/Provider';
import { useDataLayers } from '../src/DataLayerContext';

describe('TaoProvider', () => {
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

  it('should export a TaoProvider function component', () => {
    expect(TaoProvider).toBeDefined();
    expect(TaoProvider).toBeInstanceOf(Function);
  });

  it('should not enforce a single child', () => {
    const kernel = new Kernel();
    expect(() => render(<TaoProvider TAO={kernel} />)).not.toThrow();
    expect(() =>
      render(
        <TaoProvider TAO={kernel}>
          <div />
        </TaoProvider>,
      ),
    ).not.toThrow();
    expect(() =>
      render(
        <TaoProvider TAO={kernel}>
          <div />
          <div />
          <div />
        </TaoProvider>,
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
        <TaoProvider TAO={kernel}>
          <Child />
        </TaoProvider>,
      ),
    ).not.toThrow();
  });

  it('should provide a Context value of just { TAO } (no data bag)', () => {
    const kernel = new Kernel();
    const Child = createConsumerChild((value) => {
      expect(Object.keys(value)).toEqual(['TAO']);
    });
    render(
      <TaoProvider TAO={kernel}>
        <Child />
      </TaoProvider>,
    );
  });

  it('should expose an empty data layer stack for useDataLayers', () => {
    const kernel = new Kernel();
    const { result } = renderHook(() => useDataLayers(), {
      wrapper: ({ children }) => (
        <TaoProvider TAO={kernel}>{children}</TaoProvider>
      ),
    });
    expect(result.current).toEqual([]);
    expect(result.current).toHaveLength(0);
  });

  it('should expose the default TAO Kernel on the default Context value', () => {
    expect(Context._currentValue.TAO).toBeDefined();
    expect(Context._currentValue.TAO).toBeInstanceOf(Kernel);
  });
});
