import { AppCtx, Kernel } from '@tao.js/core';
import Source from '../src/Source';

const TERM = 'source';
const ACTION = 'test';
const ORIENT = 'jest';

const ALT_TERM = 'source_alt';
const ALT_ACTION = 'test_alt';
const ALT_ORIENT = 'jest_alt';

let TAO = null;
function initTAO() {
  TAO = new Kernel();
}
function clearTAO() {
  TAO = null;
}

beforeEach(initTAO);
afterEach(clearTAO);

describe('Source exports a class', () => {
  it('should provide a constructor that takes a TAO as argument', () => {
    // Assemble
    // Act
    // Assert
    expect(Source).toBeDefined();
    expect(new Source(TAO, () => {}, () => {})).toBeInstanceOf(Source);
  });

  it('should throw if a Signal Network is not provided to the constructor', () => {
    // Assemble
    // Act
    // Assert
    expect(() => {
      new Source();
    }).toThrow(/must provide `kernel`/);
  });

  it('should throw if a function to send signals to the Source', () => {
    // Assemble
    // Act
    // Assert
    expect(() => {
      new Source(TAO);
    }).toThrow(/must provide `toSrc`/);
  });

  describe('provides ability to source ACs to a network', () => {
    it('should send ACs from the network to the Source', () => {
      // Assemble
      const toSrc = jest.fn((tao, data) => {
        tao, data;
      });
      const source = new Source(TAO, toSrc);
      const trigram = { t: TERM, a: ACTION, o: ORIENT };
      const data = undefined;
      // Act
      TAO.setCtx(trigram, data);
      // Assert
      expect(toSrc).toHaveBeenCalledTimes(1);
      expect(toSrc).toHaveBeenCalledWith(expect.objectContaining(trigram), {});
    });

    it('should forward an AC to the attached network', () => {
      // Assemble
      const source = new Source(TAO, jest.fn());
      const trigram = { t: TERM, a: ACTION, o: ORIENT };
      const data = undefined;
      const handler = jest.fn();
      // Act
      TAO.addInlineHandler(trigram, handler);
      source.setCtx(trigram, data);
      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining(trigram),
        {}
      );
    });

    it('should allow an AC chain to propagate in the network', async () => {
      // Assemble
      const source = new Source(TAO, jest.fn());
      const trigram = { t: TERM, a: ACTION, o: ORIENT };
      const followup = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const data = undefined;
      const handler = jest.fn((tao, data) => {
        // console.log({ handler: { tao, data } });
        return followup;
      });
      let followHandler = null;
      const followupPromise = new Promise((resolve, reject) => {
        followHandler = jest.fn((tao, data) => {
          // console.log({ followup: { tao, data } });
          resolve(tao);
        });
      });
      // Act
      TAO.addInlineHandler(trigram, handler);
      TAO.addInlineHandler(followup.unwrapCtx(), followHandler);
      source.setCtx(trigram, data);
      // Assert
      await followupPromise;
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining(trigram),
        {}
      );
      expect(followHandler).toHaveBeenCalledTimes(1);
      expect(followHandler).toHaveBeenCalledWith(
        expect.objectContaining(followup.unwrapCtx()),
        {}
      );
    });
  });
});
