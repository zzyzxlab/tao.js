import { Component, createElement } from 'react';
import { AppCtx } from '@tao.js/core';
import Kernel from '@tao.js/core/lib/Kernel';
import Adapter from '../lib/Adapter';

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

beforeEach(initTAO);
afterEach(clearTAO);

describe('Adapter exports a class', () => {
  it('should provide a constructor that takes a TAO as argument', () => {
    // Assemble
    // Act
    // Assert
    expect(Adapter).toBeDefined();
    expect(new Adapter(TAO)).toBeInstanceOf(Adapter);
  });

  it('should provide a defaultCtx getter to retrieve the default AC', () => {
    // Assemble
    const uut = new Adapter(TAO);
    // Act
    // Assert
    expect(uut.defaultCtx).toBeDefined();
    expect(uut.defaultCtx).toMatchObject({});
  });

  it('should provide a defaultCtx setter which will set the defaults for ACs', () => {
    // Assemble
    const uut = new Adapter(TAO);
    const ctx1 = { term: TERM };
    const ctx2 = { t: ALT_TERM, a: ACTION };
    const expected2 = { term: ALT_TERM, action: ACTION };
    // Act
    uut.defaultCtx = ctx1;
    // Assert
    expect(uut.defaultCtx).toMatchObject(ctx1);
    // Act
    uut.defaultCtx = ctx2;
    // Assert
    expect(uut.defaultCtx).toMatchObject(expected2);
  });

  it('should not allow return from defaultCtx getter to update the default AC', () => {
    // Assemble
    const uut = new Adapter(TAO);
    // Act
    uut.defaultCtx = { term: TERM };
    const defCtx = uut.defaultCtx;
    defCtx.action = ACTION;
    // Assert
    expect(uut.defaultCtx).toMatchObject({ term: TERM });
    expect(uut.defaultCtx).not.toMatchObject({ action: ACTION });
  });

  it('should allow defaultCtx to be unset', () => {
    // Assemble
    const uut = new Adapter(TAO);
    uut.defaultCtx = { term: TERM };
    // Act
    uut.defaultCtx = undefined;
    // Assert
    expect(uut.defaultCtx).not.toMatchObject({ term: TERM });
    expect(uut.defaultCtx).toMatchObject({});
  });

  it('should provide a chainable setDefaultCtx to set AC defaults to reduce verbosity', () => {
    // Assemble
    const uut = new Adapter(TAO);
    const defCtx1 = { term: TERM, action: ACTION };
    const defCtx2 = { a: ALT_ACTION, o: ALT_ORIENT };
    const expected2 = { action: ALT_ACTION, orient: ALT_ORIENT };
    // Act
    const returned1 = uut.setDefaultCtx(defCtx1);
    const actual1 = uut.defaultCtx;
    const returned2 = uut.setDefaultCtx(defCtx2);
    const actual2 = uut.defaultCtx;
    // Assert
    expect(uut.setDefaultCtx).toBeDefined();
    expect(uut.setDefaultCtx).toBeInstanceOf(Function);
    expect(returned1).toBe(uut);
    expect(returned2).toBe(uut);
    expect(actual1).toMatchObject(defCtx1);
    expect(actual2).toMatchObject(expected2);
  });

  it('should allow setDefaultCtx to unset the defaults', () => {
    // Assemble
    const uut = new Adapter(TAO);
    uut.defaultCtx = { term: TERM };
    // Act
    uut.setDefaultCtx();
    // Assert
    expect(uut.defaultCtx).not.toMatchObject({ term: TERM });
    expect(uut.defaultCtx).toMatchObject({});
  });

  it('should provide a `current` getter to retrieve the current Component context - initially null', () => {
    // Assemble
    const uut = new Adapter(TAO);
    // Act
    // Assert
    expect(uut.current).toBeDefined();
    expect(uut.current).toBeNull();
  });
});

describe('Adapter integrates with React', () => {
  describe('by allowing to add Components as AC Handlers', () => {
    it('should provide an addComponentHandler chainable function', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      // Assert
      expect(uut.addComponentHandler).toBeDefined();
      expect(uut.addComponentHandler).toBeInstanceOf(Function);
      expect(uut.addComponentHandler(ac.unwrapCtx(true), Component)).toBe(uut);
    });

    it('should throw an Error when trying to add handler for something other than a React.Component', () => {
      // Assemble
      const uut = new Adapter(TAO);
      // Act
      const willThrow = () =>
        uut.addComponentHandler(
          { term: TERM, action: ACTION, orient: ORIENT },
          'Component'
        );
      // Assert
      expect(willThrow).toThrow(
        'cannot add a Component handler that is not a React.Component or Function'
      );
    });

    it('should update the `current` value using the Component when a matching AC is triggered', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      uut.addComponentHandler(triggerAc.unwrapCtx(true), Component);
      // const initialCurrent = uut.current;
      // Act
      TAO.setAppCtx(triggerAc);
      // Assert
      expect(uut.current).not.toBeNull();
      expect(uut.current).toMatchObject({
        ComponentHandler: Component,
        tao: triggerAc.unwrapCtx(),
        props: {
          [TERM]: triggerData
        }
      });
    });

    it('should add the same Component to multiple ACs', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData1 = { a: 1 };
      const triggerData2 = { b: 2 };
      // Act
      uut.addComponentHandler(
        { t: [TERM, ALT_TERM], a: [ACTION], o: ORIENT },
        Component
      );
      TAO.setCtx({ t: TERM, a: ACTION, o: ORIENT }, [triggerData1]);
      const actual1 = uut.current;
      TAO.setCtx({ t: ALT_TERM, a: ACTION, o: ORIENT }, [null, triggerData2]);
      const actual2 = uut.current;
      expect(actual1).not.toMatchObject(actual2);
      expect(actual1).toMatchObject({
        ComponentHandler: Component,
        tao: { t: TERM, a: ACTION, o: ORIENT },
        props: { [TERM]: triggerData1 }
      });
      expect(actual2).toMatchObject({
        ComponentHandler: Component,
        tao: { t: ALT_TERM, a: ACTION, o: ORIENT },
        props: { [ACTION]: triggerData2 }
      });
    });

    it('should not add Component when AC is not provided', () => {
      // Assemble
      const uut = new Adapter(TAO);
      // Act
      uut
        .addComponentHandler({}, Component)
        .addComponentHandler(undefined, Component);
      // Assert
      expect(uut._components.size).toBe(0);
    });

    it('should allow adding the same Component more than once', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const ac1 = new AppCtx(TERM, ACTION, ORIENT);
      const ac2 = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      // Act
      uut
        .addComponentHandler(ac1.unwrapCtx(true), Component)
        .addComponentHandler(ac2.unwrapCtx(), Component);
      TAO.setAppCtx(ac1);
      const actual1 = uut.current;
      TAO.setAppCtx(ac2);
      const actual2 = uut.current;
      // Assert
      expect(actual1).not.toBe(actual2);
      expect(actual1).not.toMatchObject(actual2);
      expect(actual1).toMatchObject({
        ComponentHandler: Component,
        tao: ac1.unwrapCtx(),
        props: {}
      });
      expect(actual2).toMatchObject({
        ComponentHandler: Component,
        tao: ac2.unwrapCtx(),
        props: {}
      });
    });

    it('should not add the same Component to the same AC more than once', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      uut
        .addComponentHandler(ac.unwrapCtx(), Component)
        .addComponentHandler(ac.unwrapCtx(true), Component);
      // Assert
      expect(Array.from(uut._components.keys())).toContain(Component);
      const compHandler = uut._components.get(Component);
      expect(compHandler.index.size).toBe(1);
      expect(compHandler.handlers.size).toBe(1);
    });

    it('should allow clearing a Component for an AC', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData1 = { a: 1 };
      const triggerData2 = { b: 2 };
      uut.addComponentHandler(
        { term: [TERM], action: ACTION, orient: ORIENT },
        Component
      );
      uut.addComponentHandler({
        term: ALT_TERM,
        action: ACTION,
        orient: ORIENT
      });
      // Act
      TAO.setCtx({ t: TERM, a: ACTION, o: ORIENT }, [triggerData1]);
      const actual1 = uut.current;
      TAO.setCtx({ t: ALT_TERM, a: ACTION, o: ORIENT }, [null, triggerData2]);
      const actual2 = uut.current;
      expect(actual1).not.toMatchObject(actual2);
      expect(actual1).toMatchObject({
        ComponentHandler: Component,
        tao: { t: TERM, a: ACTION, o: ORIENT },
        props: { [TERM]: triggerData1 }
      });
      expect(actual2).toMatchObject({
        ComponentHandler: null,
        tao: { t: ALT_TERM, a: ACTION, o: ORIENT },
        props: { [ACTION]: triggerData2 }
      });
    });

    it('should use the defaultCtx to fill in missing parts of the AC when adding a Component', async () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      // Act
      uut.defaultCtx = { term: TERM, orient: ORIENT };
      uut.addComponentHandler({ a: ACTION }, Component);
      await TAO.setAppCtx(triggerAc);
      // Assert
      expect(uut.current).toMatchObject({
        ComponentHandler: Component,
        tao: triggerAc.unwrapCtx(),
        props: {
          [triggerAc.t]: triggerData
        }
      });
    });

    it('should allow defining default props passed to the Component', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const defProps = { one: 1, two: 2 };
      const acData = { a: 1 };
      const ac1 = new AppCtx(TERM, ACTION, ORIENT);
      const ac2 = new AppCtx(TERM, ACTION, ORIENT, [acData]);
      // Act
      uut.addComponentHandler(ac1.unwrapCtx(true), Component, defProps);
      TAO.setAppCtx(ac1);
      const actual1 = uut.current;
      TAO.setAppCtx(ac2);
      const actual2 = uut.current;
      // Assert
      expect(actual1).not.toBe(actual2);
      expect(actual1).not.toMatchObject(actual2);
      expect(actual1).toMatchObject({
        ComponentHandler: Component,
        tao: ac1.unwrapCtx(),
        props: defProps
      });
      expect(actual2).toMatchObject({
        ComponentHandler: Component,
        tao: ac2.unwrapCtx(),
        props: {
          ...defProps,
          [ac2.t]: acData
        }
      });
    });
  });

  describe('can also remove Components from handling ACs', () => {
    it('should provide a removeComponentHandler chainable function', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      // Assert
      expect(uut.removeComponentHandler).toBeDefined();
      expect(uut.removeComponentHandler).toBeInstanceOf(Function);
      expect(uut.removeComponentHandler(ac.unwrapCtx(true), Component)).toBe(
        uut
      );
    });

    it('should remove a Component from handling an AC', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      uut.addComponentHandler(ac.unwrapCtx(true), Component);
      // Act
      uut.removeComponentHandler(ac.unwrapCtx(), Component);
      TAO.setAppCtx(ac);
      const actual = uut.current;
      // Assert
      const compHandler = uut._components.get(Component);
      expect(compHandler.index.size).toBe(0);
      expect(compHandler.handlers.size).toBe(0);
      expect(actual).toBeNull();
    });

    it('should remove a Component entirely (all ACs)', () => {
      // Assemble
      const uut = new Adapter(TAO);
      // Act
      uut.addComponentHandler(
        {
          term: [TERM, ALT_TERM],
          action: [ACTION, ALT_ACTION],
          orient: [ORIENT, ALT_ORIENT]
        },
        Component
      );
      const added = new Map(uut._components);
      uut.removeComponentHandler(undefined, Component);
      TAO.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      const actual = uut.current;
      // Assert
      expect(uut._components).not.toMatchObject(added);
      expect(uut._components.size).toBe(0);
      expect(actual).toBeNull();
    });

    it('should not remove a Component handler for an AC that it was not added for', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      uut.addComponentHandler(ac.unwrapCtx(true), Component);
      const expected = new Map(uut._components);
      // Act
      uut.removeComponentHandler(
        { term: ALT_TERM, action: ACTION, orient: ORIENT },
        Component
      );
      TAO.setAppCtx(ac);
      const actual = uut.current;
      // Assert
      expect(uut._components).toMatchObject(expected);
      expect(actual).not.toBeNull();
      expect(actual).toMatchObject({
        ComponentHandler: Component,
        tao: ac.unwrapCtx(),
        props: {}
      });
    });
  });

  describe('by allowing components to register as reactors', () => {
    it('should have register and unregister methods for reactors', () => {
      // Assemble
      const uut = new Adapter(TAO);
      // Act
      // Assert
      expect(uut.registerReactor).toBeDefined();
      expect(uut.registerReactor).toBeInstanceOf(Function);
      expect(uut.unregisterReactor).toBeDefined();
      expect(uut.unregisterReactor).toBeInstanceOf(Function);
    });

    it('should call a notify change function of a reactor on a hnadled AC', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      uut.addComponentHandler(triggerAc.unwrapCtx(true), Component);
      const onNotify = jest.fn().mockName('reactor notifier');
      const reactor = createElement(Component);
      // Act
      uut.registerReactor(reactor, onNotify);
      TAO.setAppCtx(triggerAc);
      // Assert
      expect(onNotify).toHaveBeenCalled();
    });

    it('should not break if a notifier is not passed when registering a reactor', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      uut.addComponentHandler(triggerAc.unwrapCtx(true), Component);
      const reactor = createElement(Component);
      // Act
      uut.registerReactor(reactor);
      TAO.setAppCtx(triggerAc);
      // Assert
      expect(true).toBeTruthy();
    });

    it('should notify all reactors registered when an AC is hnadled', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      uut.addComponentHandler(triggerAc.unwrapCtx(true), Component);
      const onNotify1 = jest.fn().mockName('reactor notifier 1');
      const onNotify2 = jest.fn().mockName('reactor notifier 2');
      const onNotify3 = jest.fn().mockName('reactor notifier 3');
      const reactor1 = createElement(Component);
      const reactor2 = createElement(Component);
      const reactor3 = createElement(Component);
      // Act
      uut.registerReactor(reactor1, onNotify1);
      uut.registerReactor(reactor2, onNotify2);
      uut.registerReactor(reactor3, onNotify3);
      TAO.setAppCtx(triggerAc);
      // Assert
      expect(onNotify1).toHaveBeenCalled();
      expect(onNotify2).toHaveBeenCalled();
      expect(onNotify3).toHaveBeenCalled();
    });

    it('should not notify reactors that unregister when an AC is hnadled', () => {
      // Assemble
      const uut = new Adapter(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      uut.addComponentHandler(triggerAc.unwrapCtx(), Component);
      const onNotify1 = jest.fn().mockName('reactor notifier 1');
      const onNotifyUnregister = jest
        .fn()
        .mockName('reactor notifier unregistered');
      const onNotify3 = jest.fn().mockName('reactor notifier 3');
      const reactor1 = createElement(Component);
      const reactorToUnregister = createElement(Component);
      const reactor3 = createElement(Component);
      uut.registerReactor(reactor1, onNotify1);
      uut.registerReactor(reactorToUnregister, onNotifyUnregister);
      uut.registerReactor(reactor3, onNotify3);
      // Act
      uut.unregisterReactor(reactorToUnregister);
      TAO.setAppCtx(triggerAc);
      // Assert
      expect(onNotify1).toHaveBeenCalled();
      expect(onNotifyUnregister).not.toHaveBeenCalled();
      expect(onNotify3).toHaveBeenCalled();
    });
  });
});
