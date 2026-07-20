import React, { Component } from 'react';
// Component still used by createConsumerChild class below
import { render, cleanup } from '@testing-library/react';
import { Kernel } from '@tao.js/core';
import TaoProvider, { Context, Provider } from '../src/Provider';
import { warnDeprecated, _resetDeprecationWarnings } from '../src/deprecations';

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

  it('should provide an empty data bag for named DataHandler contexts', () => {
    const kernel = new Kernel();
    const Child = createConsumerChild(({ data }) => {
      expect(data).toEqual({});
    });
    render(
      <TaoProvider TAO={kernel}>
        <Child />
      </TaoProvider>,
    );
  });

  it('should expose an empty data layer stack for useDataLayers', () => {
    const { useDataLayers } = require('../src/DataLayerContext');
    const { renderHook } = require('@testing-library/react');
    const kernel = new Kernel();
    const { result } = renderHook(() => useDataLayers(), {
      wrapper: ({ children }) => (
        <TaoProvider TAO={kernel}>{children}</TaoProvider>
      ),
    });
    expect(result.current).toEqual([]);
    expect(result.current).toHaveLength(0);
  });

  it('should expose TAO and data on the default Context value', () => {
    expect(Context._currentValue.TAO).toBeDefined();
    expect(Context._currentValue.data).toEqual({});
  });

  it('Provider alias still provides the Kernel and warns once in development', () => {
    _resetDeprecationWarnings();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const kernel = new Kernel();
    const Child = createConsumerChild(({ TAO }) => {
      expect(TAO).toBe(kernel);
    });

    render(
      <Provider TAO={kernel}>
        <Child />
      </Provider>,
    );
    render(
      <Provider TAO={kernel}>
        <Child />
      </Provider>,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('`Provider` is deprecated'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('TaoProvider'),
    );

    // Deprecation key must be 'Provider' (not '') so a distinct empty key still warns.
    warnDeprecated('', 'empty-key-msg');
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith('empty-key-msg');

    warnSpy.mockRestore();
    _resetDeprecationWarnings();
  });
});
