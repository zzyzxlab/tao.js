import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
// import TestRenderer from 'react-test-renderer';
import { mount } from 'enzyme';
import { AppCtx } from '@tao.js/core';
import Kernel from '@tao.js/core/build/Kernel';
import Provider from '../build/Provider';
import Reactor from '../build/Reactor';
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

  it('should require one property called `provider` that must be a Provider', () => {
    // Assemble
    const provider = new Provider(TAO);
    const notAProvider = 'call me maybe';
    const originalConsoleError = console.error;
    const mockConsoleError = (console.error = jest
      .fn()
      // .fn(msg => {
      //   console.log(JSON.stringify({ msg }));
      // })
      .mockName('mock console.error'));

    // Act
    const goodWrapper = mount(<Reactor provider={provider} />);
    const missingProviderThrows = () => mount(<Reactor />);
    const nonProviderThrows = () => mount(<Reactor provider={notAProvider} />);

    // Assert
    expect(goodWrapper.prop('provider')).toBe(provider);
    expect(missingProviderThrows).toThrow();
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      1,
      'Warning: Failed prop type: The prop `provider` is marked as required in `Reactor`, but its value is `undefined`.\n    in Reactor'
    );
    mockConsoleError.mockClear();
    expect(nonProviderThrows).toThrow();
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      1,
      'Warning: Failed prop type: Invalid prop `provider` of type `String` supplied to `Reactor`, expected instance of `Provider`.\n    in Reactor'
    );
    console.error = originalConsoleError;
  });

  it('should register for changes with the Provider when mounted', () => {
    // Assemble
    const provider = new Provider(TAO);
    const registerMock = jest.spyOn(provider, 'registerReactor');

    // Act
    const wrapper = mount(<Reactor provider={provider} />);

    // Assert
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith(
      wrapper.instance(),
      expect.any(Function)
    );
  });

  it('should unregister from the Provider when unmounting', () => {
    // Assemble
    const provider = new Provider(TAO);
    const unregisterMock = jest.spyOn(provider, 'unregisterReactor');
    const wrapper = mount(<Reactor provider={provider} />);
    const wrapperInstance = wrapper.instance();

    // Act
    wrapper.unmount();

    // Assert
    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(unregisterMock).toHaveBeenCalledWith(wrapperInstance);
  });

  it('should not render a component without an AC being triggered', () => {
    // Assemble
    const provider = new Provider(TAO);

    // Act
    const wrapper = mount(<Reactor provider={provider} />);
    // console.log('wrapper.find:', wrapper.find('Reactor').debug());
    // console.log('wrapper.render:', wrapper.render());

    // Assert
    expect(wrapper.instance()).toBeInstanceOf(Reactor);
    expect(wrapper.find('Reactor')).toBeEmptyRender();
    expect(wrapper.prop('provider')).toBe(provider);
  });

  it('should render a component set as a Handler for an AC', () => {
    // Assemble
    const provider = new Provider(TAO);
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' }
    });
    provider.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    provider.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey'
    });
    // const reactor = <Reactor provider={provider} />;

    // Act
    const wrapper = mount(<Reactor provider={provider} />);
    expect(wrapper.find('Reactor')).toBeEmptyRender();
    expect(wrapper.prop('provider')).toBe(provider);
    expect(provider.current).toBeDefined();
    expect(provider.current).toBeNull();
    // console.log('pre.debug:', wrapper.debug());
    TAO.setAppCtx(triggerAc1);
    expect(provider.current).toBeDefined();
    expect(provider.current.ComponentHandler).toBeDefined();
    expect(provider.current.ComponentHandler).toBeInstanceOf(Function);
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
    const provider = new Provider(TAO);
    const componentAAppCtx = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const missingComponentAppCtx = new AppCtx(TERM, ALT_ACTION, ORIENT);
    provider.addComponentHandler(
      componentAAppCtx.unwrapCtx(true),
      TestComponentA
    );
    provider.addComponentHandler(missingComponentAppCtx.unwrapCtx(true));

    // Act
    const wrapper = mount(<Reactor provider={provider} />);
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
    expect(wrapper.prop('provider')).toBe(provider);
  });
});

describe("Reactor Component's provider can be swapped using props changes", () => {
  it('should unregister and register if Provider is changed', () => {
    // Assemble
    const provider1 = new Provider(TAO);
    const provider2 = new Provider(TAO);
    const unregisterMock = jest.spyOn(provider1, 'unregisterReactor');
    const registerMock = jest.spyOn(provider2, 'registerReactor');
    const wrapper = mount(<Reactor provider={provider1} />);

    // Act
    wrapper.setProps({ provider: provider2 });

    // Assert
    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(unregisterMock).toHaveBeenCalledWith(wrapper.instance());
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith(
      wrapper.instance(),
      expect.any(Function)
    );
  });

  it('should ignore changes from the old Provider', () => {
    // Assemble
    const provider1 = new Provider(TAO);
    const provider2 = new Provider(TAO);
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    provider1.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    const wrapper = mount(<Reactor provider={provider1} />);

    // Act
    wrapper.setProps({ provider: provider2 });
    TAO.setAppCtx(triggerAc1);
    wrapper.update();

    // Assert
    expect(wrapper.find('Reactor')).toBeEmptyRender();
    expect(wrapper.prop('provider')).toBe(provider2);
    expect(provider2.current).toBeDefined();
    expect(provider2.current).toBeNull();
  });

  it('should react to changes from the new Provider', () => {
    // Assemble
    const provider1 = new Provider(TAO);
    const provider2 = new Provider(TAO);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' }
    });
    provider2.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey'
    });
    const wrapper = mount(<Reactor provider={provider1} />);

    // Act
    wrapper.setProps({ provider: provider2 });
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

  it('should react to changes if setting Provider to same previously set Provider', () => {
    // Assemble
    const provider = new Provider(TAO);
    const unregisterMock = jest.spyOn(provider, 'unregisterReactor');
    const registerMock = jest.spyOn(provider, 'registerReactor');
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' }
    });
    provider.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    provider.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey'
    });
    const wrapper = mount(<Reactor provider={provider} />);

    // Act
    TAO.setAppCtx(triggerAc1);
    wrapper.update();
    wrapper.setProps({ provider: provider });
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
