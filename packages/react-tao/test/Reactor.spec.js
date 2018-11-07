import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
// import TestRenderer from 'react-test-renderer';
import { mount } from 'enzyme';
import { AppCtx, Kernel } from '../../tao/src';
// import { AppCtx, Kernel } from '@tao.js/core';
import Adapter from '../src/Adapter';
import Reactor from '../src/Reactor';
// import { wrap } from 'module';

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

const TestComponentA = props => <div id={props[TERM].id}>Test Component A</div>;
const TestComponentB = props => {
  // console.log('TestComponentB.props:', props);
  return <div name={props[ALT_ACTION].name}>Test Component B</div>;
};

beforeEach(initTAO);
afterEach(clearTAO);

describe('Reactor exports a React Component for reacting to TAO App Contexts', () => {
  it('should provide a constructor that inherits from React.Component', () => {
    // Assemble
    // Act
    // Assert
    expect(Reactor).toBeDefined();
    expect(new Reactor()).toBeInstanceOf(Reactor);
    expect(new Reactor()).not.toBeInstanceOf(Function);
    expect(new Reactor()).toBeInstanceOf(Component);
  });

  it('should require one property called `adapter` that must be a Adapter', () => {
    // Assemble
    const adapter = new Adapter(TAO);
    const notAAdapter = 'call me maybe';
    const originalConsoleError = console.error;
    const mockConsoleError = (console.error = jest
      .fn()
      // .fn(msg => {
      //   console.log(JSON.stringify({ msg }));
      // })
      .mockName('mock console.error'));

    // Act
    const goodWrapper = mount(<Reactor adapter={adapter} />);
    const missingAdapterThrows = () => mount(<Reactor />);
    const nonAdapterThrows = () => mount(<Reactor adapter={notAAdapter} />);

    // Assert
    expect(goodWrapper.prop('adapter')).toBe(adapter);
    expect(missingAdapterThrows).toThrow();
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      1,
      'Warning: Failed prop type: The prop `adapter` is marked as required in `Reactor`, but its value is `undefined`.\n    in Reactor'
    );
    mockConsoleError.mockClear();
    expect(nonAdapterThrows).toThrow();
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      1,
      'Warning: Failed prop type: Invalid prop `adapter` of type `String` supplied to `Reactor`, expected instance of `Adapter`.\n    in Reactor'
    );
    console.error = originalConsoleError;
  });

  it('should register for changes with the Adapter when mounted', () => {
    // Assemble
    const adapter = new Adapter(TAO);
    const registerMock = jest.spyOn(adapter, 'registerReactor');

    // Act
    const wrapper = mount(<Reactor adapter={adapter} />);

    // Assert
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith(
      wrapper.instance(),
      expect.any(Function)
    );
  });

  it('should unregister from the Adapter when unmounting', () => {
    // Assemble
    const adapter = new Adapter(TAO);
    const unregisterMock = jest.spyOn(adapter, 'unregisterReactor');
    const wrapper = mount(<Reactor adapter={adapter} />);
    const wrapperInstance = wrapper.instance();

    // Act
    wrapper.unmount();

    // Assert
    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(unregisterMock).toHaveBeenCalledWith(wrapperInstance);
  });

  it('should not render a component without an AC being triggered', () => {
    // Assemble
    const adapter = new Adapter(TAO);

    // Act
    const wrapper = mount(<Reactor adapter={adapter} />);
    // console.log('wrapper.find:', wrapper.find('Reactor').debug());
    // console.log('wrapper.render:', wrapper.render());

    // Assert
    expect(wrapper.instance()).toBeInstanceOf(Reactor);
    expect(wrapper.find('Reactor')).toBeEmptyRender();
    expect(wrapper.prop('adapter')).toBe(adapter);
  });

  it('should render a component set as a Handler for an AC', () => {
    // Assemble
    const adapter = new Adapter(TAO);
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' }
    });
    adapter.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    adapter.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey'
    });
    // const reactor = <Reactor adapter={adapter} />;

    // Act
    const wrapper = mount(<Reactor adapter={adapter} />);
    expect(wrapper.find('Reactor')).toBeEmptyRender();
    expect(wrapper.prop('adapter')).toBe(adapter);
    expect(adapter.current).toBeDefined();
    expect(adapter.current).toBeNull();
    // console.log('pre.debug:', wrapper.debug());
    TAO.setAppCtx(triggerAc1);
    expect(adapter.current).toBeDefined();
    expect(adapter.current.ComponentHandler).toBeDefined();
    expect(adapter.current.ComponentHandler).toBeInstanceOf(Function);
    // console.log('post-setAppCtx.debug:', wrapper.debug());
    wrapper.update();
    // console.log('post-update.debug:', wrapper.debug());

    // Assert
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.find('TestComponentA').length).toBe(1);
    expect(wrapper.find('Reactor')).toContainReact(
      TestComponentA({ ...triggerAc1.unwrapCtx(), [TERM]: { id: 1 } })
    );

    // Act
    TAO.setAppCtx(triggerAc2);
    wrapper.update();
    // console.log('pos-trigger2.debug:', wrapper.debug());

    // Assert
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.find('TestComponentB').length).toBe(1);
    expect(wrapper.find('Reactor')).toContainReact(
      TestComponentB({
        ...triggerAc2.unwrapCtx(),
        [ALT_ACTION]: { name: 'doooood' },
        css: 'hey'
      })
    );
  });

  it('should render empty if AC triggered with no (null) ComponentHandler', () => {
    // Assemble
    const adapter = new Adapter(TAO);
    const componentAAppCtx = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const missingComponentAppCtx = new AppCtx(TERM, ALT_ACTION, ORIENT);
    adapter.addComponentHandler(
      componentAAppCtx.unwrapCtx(true),
      TestComponentA
    );
    adapter.addComponentHandler(missingComponentAppCtx.unwrapCtx(true));

    // Act
    const wrapper = mount(<Reactor adapter={adapter} />);
    TAO.setAppCtx(componentAAppCtx);
    wrapper.update();
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.find('TestComponentA').length).toBe(1);
    expect(wrapper.find('Reactor')).toContainReact(
      TestComponentA({ ...componentAAppCtx.unwrapCtx(), [TERM]: { id: 1 } })
    );

    TAO.setAppCtx(missingComponentAppCtx);
    wrapper.update();

    // Assert
    expect(wrapper.find('Reactor')).toBeEmptyRender();
    expect(wrapper.prop('adapter')).toBe(adapter);
  });
});

describe("Reactor Component's adapter can be swapped using props changes", () => {
  it('should unregister and register if Adapter is changed', () => {
    // Assemble
    const adapter1 = new Adapter(TAO);
    const adapter2 = new Adapter(TAO);
    const unregisterMock = jest.spyOn(adapter1, 'unregisterReactor');
    const registerMock = jest.spyOn(adapter2, 'registerReactor');
    const wrapper = mount(<Reactor adapter={adapter1} />);

    // Act
    wrapper.setProps({ adapter: adapter2 });

    // Assert
    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(unregisterMock).toHaveBeenCalledWith(wrapper.instance());
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith(
      wrapper.instance(),
      expect.any(Function)
    );
  });

  it('should ignore changes from the old Adapter', () => {
    // Assemble
    const adapter1 = new Adapter(TAO);
    const adapter2 = new Adapter(TAO);
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    adapter1.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    const wrapper = mount(<Reactor adapter={adapter1} />);

    // Act
    wrapper.setProps({ adapter: adapter2 });
    TAO.setAppCtx(triggerAc1);
    wrapper.update();

    // Assert
    expect(wrapper.find('Reactor')).toBeEmptyRender();
    expect(wrapper.prop('adapter')).toBe(adapter2);
    expect(adapter2.current).toBeDefined();
    expect(adapter2.current).toBeNull();
  });

  it('should react to changes from the new Adapter', () => {
    // Assemble
    const adapter1 = new Adapter(TAO);
    const adapter2 = new Adapter(TAO);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' }
    });
    adapter2.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey'
    });
    const wrapper = mount(<Reactor adapter={adapter1} />);

    // Act
    wrapper.setProps({ adapter: adapter2 });
    TAO.setAppCtx(triggerAc2);
    wrapper.update();

    // Assert
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.find('TestComponentB').length).toBe(1);
    expect(wrapper.find('Reactor')).toContainReact(
      TestComponentB({
        ...triggerAc2.unwrapCtx(),
        [ALT_ACTION]: { name: 'doooood' },
        css: 'hey'
      })
    );
  });

  it('should react to changes if setting Adapter to same previously set Adapter', () => {
    // Assemble
    const adapter = new Adapter(TAO);
    const unregisterMock = jest.spyOn(adapter, 'unregisterReactor');
    const registerMock = jest.spyOn(adapter, 'registerReactor');
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' }
    });
    adapter.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    adapter.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey'
    });
    const wrapper = mount(<Reactor adapter={adapter} />);

    // Act
    TAO.setAppCtx(triggerAc1);
    wrapper.update();
    wrapper.setProps({ adapter: adapter });
    TAO.setAppCtx(triggerAc2);
    wrapper.update();

    // Assert
    expect(unregisterMock).not.toHaveBeenCalled();
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.find('TestComponentB').length).toBe(1);
    expect(wrapper.find('Reactor')).toContainReact(
      TestComponentB({
        ...triggerAc2.unwrapCtx(),
        [ALT_ACTION]: { name: 'doooood' },
        css: 'hey'
      })
    );
  });
});
