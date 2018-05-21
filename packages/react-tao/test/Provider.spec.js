import React, { Component } from 'react';
import { AppCtx } from '@tao.js/core';
import Kernel from '@tao.js/core/build/Kernel';
import Provider from '../build/Provider';

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

describe('Provider exports a class', () => {
  it('should provide a constructor that takes a TAO as argument', () => {
    // Assemble
    // Act
    // Assert
    expect(Provider).toBeDefined();
    expect(new Provider(TAO)).toBeInstanceOf(Provider);
  });

  it('should provide a defaultCtx getter to retrieve the default AC', () => {
    // Assemble
    const uut = new Provider(TAO);
    // Act
    // Assert
    expect(uut.defaultCtx).toBeDefined();
    expect(uut.defaultCtx).toMatchObject({});
  });

  it('should provide a defaultCtx setter which will set the defaults for ACs', () => {
    // Assemble
    const uut = new Provider(TAO);
    // Act
    uut.defaultCtx = { term: TERM };
    // Assert
    expect(uut.defaultCtx).toMatchObject({ term: TERM });
  });

  it('should not allow return from defaultCtx getter to update the default AC', () => {
    // Assemble
    const uut = new Provider(TAO);
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
    const uut = new Provider(TAO);
    uut.defaultCtx = { term: TERM };
    // Act
    uut.defaultCtx = undefined;
    // Assert
    expect(uut.defaultCtx).not.toMatchObject({ term: TERM });
    expect(uut.defaultCtx).toMatchObject({});
  });

  it('should provide a chainable setDefaultCtx to set AC defaults to reduce verbosity', () => {
    // Assemble
    const uut = new Provider(TAO);
    const defCtx = { term: TERM, action: ACTION };
    // Act
    const returned = uut.setDefaultCtx(defCtx);
    // Assert
    expect(uut.setDefaultCtx).toBeDefined();
    expect(uut.setDefaultCtx).toBeInstanceOf(Function);
    expect(returned).toBe(uut);
    expect(uut.defaultCtx).toMatchObject(defCtx);
  });

  it('should allow setDefaultCtx to unset the defaults', () => {
    // Assemble
    const uut = new Provider(TAO);
    uut.defaultCtx = { term: TERM };
    // Act
    uut.setDefaultCtx();
    // Assert
    expect(uut.defaultCtx).not.toMatchObject({ term: TERM });
    expect(uut.defaultCtx).toMatchObject({});
  });

  it('should provide a `current` getter to retrieve the current Component context - initially null', () => {
    // Assemble
    const uut = new Provider(TAO);
    // Act
    // Assert
    expect(uut.current).toBeDefined();
    expect(uut.current).toBeNull();
  });
});

describe('Provider integrates with React', () => {
  describe('by allowing to add Components as AC Handlers', () => {
    it('should provide an addComponentHandler chainable function', () => {
      // Assemble
      const uut = new Provider(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      // Assert
      expect(uut.addComponentHandler).toBeDefined();
      expect(uut.addComponentHandler).toBeInstanceOf(Function);
      expect(uut.addComponentHandler(ac.unwrapCtx(true), Component)).toBe(uut);
    });

    it('should throw an Error when trying to add a null or undefined Component', () => {
      // Assemble
      const uut = new Provider(TAO);
      // Act
      const willThrow = () =>
        uut.addComponentHandler({ term: TERM, action: ACTION, orient: ORIENT });
      // Assert
      expect(willThrow).toThrow(
        'cannot add a Component handler without providing a Component'
      );
    });

    it('should update the `current` value using the Component when a matching AC is triggered', () => {
      // Assemble
      const uut = new Provider(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      uut.addComponentHandler(triggerAc.unwrapCtx(true), Component);
      // const initialCurrent = uut.current;
      // Act
      TAO.setAppCtx(triggerAc);
      // Assert
      expect(uut.current).not.toBeNull();
      expect(uut.current).toMatchObject({
        Component,
        tao: triggerAc.unwrapCtx(),
        props: {
          [TERM]: triggerData
        }
      });
    });

    it('should add the same Component to multiple ACs', () => {
      // Assemble
      const uut = new Provider(TAO);
      const triggerData1 = { a: 1 };
      const triggerData2 = { b: 2 };
      // Act
      uut.addComponentHandler(
        { term: [TERM, ALT_TERM], action: [ACTION], orient: ORIENT },
        Component
      );
      TAO.setCtx({ t: TERM, a: ACTION, o: ORIENT }, [triggerData1]);
      const actual1 = uut.current;
      TAO.setCtx({ t: ALT_TERM, a: ACTION, o: ORIENT }, [null, triggerData2]);
      const actual2 = uut.current;
      expect(actual1).not.toMatchObject(actual2);
      expect(actual1).toMatchObject({
        Component,
        tao: { t: TERM, a: ACTION, o: ORIENT },
        props: { [TERM]: triggerData1 }
      });
      expect(actual2).toMatchObject({
        Component,
        tao: { t: ALT_TERM, a: ACTION, o: ORIENT },
        props: { [ACTION]: triggerData2 }
      });
    });

    it('should not add Component when AC is not provided', () => {
      // Assemble
      const uut = new Provider(TAO);
      // Act
      uut
        .addComponentHandler({}, Component)
        .addComponentHandler(undefined, Component);
      // Assert
      expect(uut._components.size).toBe(0);
    });

    it('should allow adding the same Component more than once', () => {
      // Assemble
      const uut = new Provider(TAO);
      const ac1 = new AppCtx(TERM, ACTION, ORIENT);
      const ac2 = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      // Act
      uut
        .addComponentHandler(ac1.unwrapCtx(true), Component)
        .addComponentHandler(ac2.unwrapCtx(true), Component);
      TAO.setAppCtx(ac1);
      const actual1 = uut.current;
      TAO.setAppCtx(ac2);
      const actual2 = uut.current;
      // Assert
      expect(actual1).not.toBe(actual2);
      expect(actual1).not.toMatchObject(actual2);
      expect(actual1).toMatchObject({
        Component,
        tao: ac1.unwrapCtx(),
        props: {}
      });
      expect(actual2).toMatchObject({
        Component,
        tao: ac2.unwrapCtx(),
        props: {}
      });
    });

    it('should not add the same Component to the same AC more than once', () => {
      // Assemble
      const uut = new Provider(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      uut
        .addComponentHandler(ac.unwrapCtx(true), Component)
        .addComponentHandler(ac.unwrapCtx(true), Component);
      // Assert
      expect(Array.from(uut._components.keys())).toContain(Component);
      const compHandler = uut._components.get(Component);
      expect(compHandler.index.size).toBe(1);
      expect(compHandler.handlers.size).toBe(1);
    });

    it('should use the defaultCtx to fill in missing parts of the AC when adding a Component', async () => {
      // Assemble
      const uut = new Provider(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      // Act
      uut.defaultCtx = { term: TERM, orient: ORIENT };
      uut.addComponentHandler({ action: ACTION }, Component);
      await TAO.setAppCtx(triggerAc);
      // Assert
      expect(uut.current).toMatchObject({
        Component,
        tao: triggerAc.unwrapCtx(),
        props: {
          [triggerAc.t]: triggerData
        }
      });
    });

    it('should allow defining default props passed to the Component', () => {
      // Assemble
      const uut = new Provider(TAO);
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
        Component,
        tao: ac1.unwrapCtx(),
        props: defProps
      });
      expect(actual2).toMatchObject({
        Component,
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
      const uut = new Provider(TAO);
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
      const uut = new Provider(TAO);
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      uut.addComponentHandler(ac.unwrapCtx(true), Component);
      // Act
      uut.removeComponentHandler(ac.unwrapCtx(true), Component);
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
      const uut = new Provider(TAO);
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
      const uut = new Provider(TAO);
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
        Component,
        tao: ac.unwrapCtx(),
        props: {}
      });
    });
  });
});
