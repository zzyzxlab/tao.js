import React, { Component } from 'react';
import { AppCtx } from '@tao.js/core';
import Kernel from '@tao.js/core/src/Kernel';
import Provider from './Provider';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

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

    it('should update the `current` value using the Component when a matching AC is triggered', async () => {
      // Assemble
      const uut = new Provider(TAO);
      const triggerData = { a: 1 };
      const triggerAc = new AppCtx(TERM, ACTION, ORIENT, [triggerData]);
      uut.addComponentHandler(triggerAc.unwrapCtx(true), Component);
      // const initialCurrent = uut.current;
      // Act
      await TAO.setAppCtx(triggerAc);
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

    it('should add the same Component to multiple ACs', () => {});

    it('should use the defaultCtx to fill in missing parts of the AC when adding a Component', () => {});

    it('should allow defining default props passed to the Component', () => {});
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

    it('should remove a Component from handling an AC', () => {});

    it('should remove a Component entirely (all ACs)', () => {});

    it('should not remove a Component handler for an AC that it was not added for', () => {});
  });
});
