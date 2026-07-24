import React, { Component } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { AppCtx, Kernel } from '../../tao/src';
import Adapter from '../src/Adapter';
import Reactor from '../src/Reactor';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

const ALT_TERM = 'dude';
const ALT_ACTION = 'fistbump';
const ALT_ORIENT = 'bros';

let TAO = null;
function initTAO() {
  TAO = new Kernel();
}
function clearTAO() {
  TAO = null;
}

const TestComponentA = (props) => (
  <div data-testid="comp-a" id={props[TERM].id}>
    Test Component A
  </div>
);
const TestComponentB = (props) => (
  <div data-testid="comp-b" name={props[ALT_ACTION].name}>
    Test Component B
  </div>
);

beforeEach(initTAO);
afterEach(() => {
  cleanup();
  clearTAO();
});

describe('Reactor exports a React Component for reacting to TAO App Contexts', () => {
  it('should provide a constructor that inherits from React.Component', () => {
    expect(Reactor).toBeDefined();
    expect(new Reactor()).toBeInstanceOf(Reactor);
    expect(new Reactor()).not.toBeInstanceOf(Function);
    expect(new Reactor()).toBeInstanceOf(Component);
  });

  it('should require one property called `adapter` that must be a Adapter', () => {
    const adapter = new Adapter(TAO);
    const notAAdapter = 'call me maybe';
    const originalConsoleError = console.error;
    console.error = jest.fn().mockName('mock console.error');

    expect(() => render(<Reactor adapter={adapter} />)).not.toThrow();
    expect(() => render(<Reactor />)).toThrow();
    expect(() => render(<Reactor adapter={notAAdapter} />)).toThrow();

    console.error = originalConsoleError;
  });

  it('should register for changes with the Adapter when mounted', () => {
    const adapter = new Adapter(TAO);
    const registerMock = jest.spyOn(adapter, 'registerReactor');

    render(<Reactor adapter={adapter} />);

    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith(
      expect.any(Reactor),
      expect.any(Function),
    );
    registerMock.mockRestore();
  });

  it('should unregister from the Adapter when unmounting', () => {
    const adapter = new Adapter(TAO);
    const unregisterMock = jest.spyOn(adapter, 'unregisterReactor');
    const { unmount } = render(<Reactor adapter={adapter} />);

    unmount();

    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(unregisterMock).toHaveBeenCalledWith(expect.any(Reactor));
    unregisterMock.mockRestore();
  });

  it('should not render a component without an AC being triggered', () => {
    const adapter = new Adapter(TAO);
    const { queryByTestId, container } = render(<Reactor adapter={adapter} />);

    expect(queryByTestId('comp-a')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('should render a component set as a Handler for an AC', () => {
    const adapter = new Adapter(TAO);
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' },
    });
    adapter.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    adapter.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey',
    });

    const { getByTestId, queryByTestId } = render(
      <Reactor adapter={adapter} />,
    );
    expect(queryByTestId('comp-a')).toBeNull();
    expect(adapter.current).toBeNull();

    act(() => {
      TAO.setAppCtx(triggerAc1);
    });

    expect(adapter.current.ComponentHandler).toBe(TestComponentA);
    expect(getByTestId('comp-a').id).toBe('1');
    expect(queryByTestId('comp-b')).toBeNull();

    act(() => {
      TAO.setAppCtx(triggerAc2);
    });

    expect(getByTestId('comp-b').getAttribute('name')).toBe('doooood');
    expect(queryByTestId('comp-a')).toBeNull();
  });

  it('should render empty if AC triggered with no (null) ComponentHandler', () => {
    const adapter = new Adapter(TAO);
    const componentAAppCtx = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const missingComponentAppCtx = new AppCtx(TERM, ALT_ACTION, ORIENT);
    adapter.addComponentHandler(
      componentAAppCtx.unwrapCtx(true),
      TestComponentA,
    );
    adapter.addComponentHandler(missingComponentAppCtx.unwrapCtx(true));

    const { getByTestId, queryByTestId, container } = render(
      <Reactor adapter={adapter} />,
    );

    act(() => {
      TAO.setAppCtx(componentAAppCtx);
    });
    expect(getByTestId('comp-a')).toBeDefined();

    act(() => {
      TAO.setAppCtx(missingComponentAppCtx);
    });

    expect(queryByTestId('comp-a')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});

describe("Reactor Component's adapter can be swapped using props changes", () => {
  it('should unregister and register if Adapter is changed', () => {
    const adapter1 = new Adapter(TAO);
    const adapter2 = new Adapter(TAO);
    const unregisterMock = jest.spyOn(adapter1, 'unregisterReactor');
    const registerMock = jest.spyOn(adapter2, 'registerReactor');
    const { rerender } = render(<Reactor adapter={adapter1} />);

    rerender(<Reactor adapter={adapter2} />);

    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(unregisterMock).toHaveBeenCalledWith(expect.any(Reactor));
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith(
      expect.any(Reactor),
      expect.any(Function),
    );
  });

  it('should ignore changes from the old Adapter', () => {
    const adapter1 = new Adapter(TAO);
    const adapter2 = new Adapter(TAO);
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    adapter1.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    const { rerender, queryByTestId } = render(<Reactor adapter={adapter1} />);

    rerender(<Reactor adapter={adapter2} />);
    act(() => {
      TAO.setAppCtx(triggerAc1);
    });

    expect(queryByTestId('comp-a')).toBeNull();
    expect(adapter2.current).toBeNull();
  });

  it('should react to changes from the new Adapter', () => {
    const adapter1 = new Adapter(TAO);
    const adapter2 = new Adapter(TAO);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' },
    });
    adapter2.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey',
    });
    const { rerender, getByTestId } = render(<Reactor adapter={adapter1} />);

    rerender(<Reactor adapter={adapter2} />);
    act(() => {
      TAO.setAppCtx(triggerAc2);
    });

    expect(getByTestId('comp-b').getAttribute('name')).toBe('doooood');
  });

  it('should react to changes if setting Adapter to same previously set Adapter', () => {
    const adapter = new Adapter(TAO);
    const unregisterMock = jest.spyOn(adapter, 'unregisterReactor');
    const registerMock = jest.spyOn(adapter, 'registerReactor');
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' },
    });
    adapter.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    adapter.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey',
    });
    const { rerender, getByTestId } = render(<Reactor adapter={adapter} />);

    act(() => {
      TAO.setAppCtx(triggerAc1);
    });
    rerender(<Reactor adapter={adapter} />);
    act(() => {
      TAO.setAppCtx(triggerAc2);
    });

    expect(unregisterMock).not.toHaveBeenCalled();
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(getByTestId('comp-b').getAttribute('name')).toBe('doooood');
  });
});
