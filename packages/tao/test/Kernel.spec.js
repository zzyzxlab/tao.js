import { WILDCARD } from '../src/constants';
import AppCtxRoot from '../src/AppCtxRoot';
import AppCtx from '../src/AppCtx';
import Kernel from '../src/Kernel';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

const ALT_TERM = 'dude';
const ALT_ACTION = 'fistbump';
const ALT_ORIENT = 'bros';

describe('Kernel is the base entry point of execution for a tao.js app', () => {
  it('should provide a constructor', () => {
    // Assemble
    // Act
    // Assert
    expect(Kernel).toBeDefined();
    expect(new Kernel()).toBeInstanceOf(Kernel);
    expect(new Kernel()).not.toBeInstanceOf(Function);
  });

  describe('provides ability to add handlers for App Contexts', () => {
    it('should allow adding inline handlers called when context is set', () => {
      // Assemble
      const uut = new Kernel();
      const leafH = jest.fn().mockName('leaf');
      const wildH = jest.fn().mockName('wild');
      const wildPartialH = jest.fn().mockName('wild partial');
      const wildTermH = jest.fn().mockName('wild term');
      const wildActionH = jest.fn().mockName('wild action');
      const wildOrientH = jest
        .fn(() => new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT))
        .mockName('wild orient');
      expect.assertions(6);
      // Act
      uut.addInlineHandler({}, wildH);
      uut.addInlineHandler(
        { term: '', action: ACTION, orient: ORIENT },
        wildTermH,
      );
      uut.addInlineHandler({ orient: ORIENT }, wildPartialH);
      uut.addInlineHandler({ term: TERM, o: ORIENT }, wildActionH);
      uut.addInlineHandler({ t: TERM, action: ACTION, o: '' }, wildOrientH);
      uut.addInlineHandler({ t: TERM, a: ACTION, o: ORIENT }, leafH);
      uut.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(leafH).toHaveBeenCalled();
          expect(wildH).toHaveBeenCalled();
          expect(wildTermH).toHaveBeenCalled();
          expect(wildActionH).toHaveBeenCalled();
          expect(wildOrientH).toHaveBeenCalled();
          expect(wildPartialH).toHaveBeenCalled();
          resolve();
        }, 300);
      });
    });

    it('should allow adding async handlers called when context is set', () => {
      // Assemble
      const uut = new Kernel();
      const leafH = jest.fn().mockName('leaf');
      const wildH = jest.fn().mockName('wild');
      const wildTermH = jest.fn().mockName('wild term');
      const wildActionH = jest.fn().mockName('wild action');
      const wildOrientH = jest.fn().mockName('wild orient');
      expect.assertions(5);
      // Act
      uut.addAsyncHandler({}, wildH);
      uut.addAsyncHandler(
        { term: '', action: ACTION, orient: ORIENT },
        wildTermH,
      );
      uut.addAsyncHandler({ term: TERM, o: ORIENT }, wildActionH);
      uut.addAsyncHandler({ t: TERM, action: ACTION, o: '' }, wildOrientH);
      uut.addAsyncHandler({ t: TERM, a: ACTION, o: ORIENT }, leafH);
      uut.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(leafH).toHaveBeenCalled();
          expect(wildH).toHaveBeenCalled();
          expect(wildTermH).toHaveBeenCalled();
          expect(wildActionH).toHaveBeenCalled();
          expect(wildOrientH).toHaveBeenCalled();
          resolve();
        }, 300);
      });
    });

    it('should allow adding intercept handlers called when context is set', () => {
      // Assemble
      const uut = new Kernel();
      const leafH = jest.fn().mockName('leaf');
      const wildH = jest.fn().mockName('wild');
      const wildTermH = jest.fn().mockName('wild term');
      const wildActionH = jest.fn().mockName('wild action');
      const wildOrientH = jest.fn().mockName('wild orient');
      expect.assertions(5);
      // Act
      uut.addInterceptHandler({ t: TERM, a: ACTION, o: ORIENT }, leafH);
      uut.addInterceptHandler({}, wildH);
      uut.addInterceptHandler(
        { term: '', action: ACTION, orient: ORIENT },
        wildTermH,
      );
      uut.addInterceptHandler({ term: TERM, o: ORIENT }, wildActionH);
      uut.addInterceptHandler({ t: TERM, action: ACTION, o: '' }, wildOrientH);
      uut.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(leafH).toHaveBeenCalled();
          expect(wildH).toHaveBeenCalled();
          expect(wildTermH).toHaveBeenCalled();
          expect(wildActionH).toHaveBeenCalled();
          expect(wildOrientH).toHaveBeenCalled();
          resolve();
        }, 300);
      });
    });

    it('should throw if adding a handler that is not a function', () => {
      // Assemble
      const uut = new Kernel();
      const ac = { t: TERM, a: ACTION, o: ORIENT };
      expect.assertions(6);

      // Act
      const inlineThrowsEmpty = () => uut.addInlineHandler(ac);
      const inlineThrowsFunc = () => uut.addInlineHandler(ac, {});
      const asyncThrowsEmpty = () => uut.addAsyncHandler(ac);
      const asyncThrowsFunc = () => uut.addAsyncHandler(ac, []);
      const interceptThrowsEmpty = () => uut.addInterceptHandler(ac);
      const interceptThrowsFunc = () => uut.addInterceptHandler(ac, true);

      // Assert
      expect(inlineThrowsEmpty).toThrow(
        'cannot do anything with missing handler',
      );
      expect(inlineThrowsFunc).toThrow('handler must be a function');
      expect(asyncThrowsEmpty).toThrow(
        'cannot do anything with missing handler',
      );
      expect(asyncThrowsFunc).toThrow('handler must be a function');
      expect(interceptThrowsEmpty).toThrow(
        'cannot do anything with missing handler',
      );
      expect(interceptThrowsFunc).toThrow('handler must be a function');
    });

    it('should not add the same handler more than once for a given type of handling', () => {
      // Assemble
      const uut = new Kernel();
      const inlineConcrete = jest.fn().mockName('inline concrete handler');
      const asyncConcrete = jest.fn().mockName('async concrete handler');
      const interceptConcrete = jest
        .fn()
        .mockName('intercept concrete handler');
      const inlineWild = jest.fn().mockName('inline wild handler');
      const asyncWild = jest.fn().mockName('async wild handler');
      const interceptWild = jest.fn().mockName('intercept wild handler');
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      expect.assertions(6);

      // Act
      uut.addInlineHandler(ac.unwrapCtx(), inlineConcrete);
      uut.addInlineHandler(ac.unwrapCtx(), inlineConcrete);
      uut.addAsyncHandler(ac.unwrapCtx(), asyncConcrete);
      uut.addAsyncHandler(ac.unwrapCtx(), asyncConcrete);
      uut.addInterceptHandler(ac.unwrapCtx(), interceptConcrete);
      uut.addInterceptHandler(ac.unwrapCtx(), interceptConcrete);
      uut.addInlineHandler({}, inlineWild);
      uut.addInlineHandler({}, inlineWild);
      uut.addAsyncHandler({}, asyncWild);
      uut.addAsyncHandler({}, asyncWild);
      uut.addInterceptHandler({}, interceptWild);
      uut.addInterceptHandler({}, interceptWild);
      uut.setAppCtx(ac);

      // Assert
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(inlineConcrete.mock.calls.length).toBe(1);
          expect(asyncConcrete.mock.calls.length).toBe(1);
          expect(interceptConcrete.mock.calls.length).toBe(1);
          expect(inlineWild.mock.calls.length).toBe(1);
          expect(asyncWild.mock.calls.length).toBe(1);
          expect(interceptWild.mock.calls.length).toBe(1);
          resolve();
        }, 30);
      });
    });

    it('should by default prevent setting wildcard App Contexts', () => {
      // Assemble
      const uut = new Kernel();
      const indlineWildH = jest.fn().mockName('inline wild');
      const asyncWildH = jest.fn().mockName('async wild');
      const interceptWildH = jest.fn().mockName('intercept wild');
      uut.addInlineHandler({}, indlineWildH);
      uut.addAsyncHandler({}, asyncWildH);
      uut.addInterceptHandler({}, interceptWildH);
      expect.assertions(3);

      // Act
      uut.setCtx({});
      uut.setAppCtx(new AppCtx());

      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(indlineWildH).not.toHaveBeenCalled();
          expect(asyncWildH).not.toHaveBeenCalled();
          expect(interceptWildH).not.toHaveBeenCalled();
          resolve();
        }, 300);
      });
    });

    it('should allow setting wildcard App Contexts with a constructor setting', () => {
      // Assemble
      const uut = new Kernel(true);
      const indlineWildH = jest.fn().mockName('inline wild');
      const asyncWildH = jest.fn().mockName('async wild');
      const interceptWildH = jest.fn().mockName('intercept wild');
      uut.addInlineHandler({}, indlineWildH);
      uut.addAsyncHandler({}, asyncWildH);
      uut.addInterceptHandler({}, interceptWildH);
      expect.assertions(3);

      // Act
      uut.setAppCtx(new AppCtx());

      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(indlineWildH).toHaveBeenCalled();
          expect(asyncWildH).toHaveBeenCalled();
          expect(interceptWildH).toHaveBeenCalled();
          resolve();
        }, 300);
      });
    });

    it('should add missing empty leaf handler if context is set to that App Context', () => {
      // Assemble
      const uut = new Kernel();
      const ctx1 = { t: TERM, a: ACTION, o: ORIENT };
      const ctx1Key = AppCtxRoot.getKey(ctx1.t, ctx1.a, ctx1.o);
      const ctx2 = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const ctx2Key = ctx2.key;
      // expect.assertions(3);

      // Act
      uut.setCtx(ctx1);
      uut.setAppCtx(ctx2);

      // Assert
      expect(uut._network._handlers.keys()).toContain(ctx1Key);
      expect(uut._network._handlers.keys()).toContain(ctx2Key);
    });

    it('should not add missing empty wildcard handler if context is set to matching App Context', () => {
      // Assemble
      const uut = new Kernel(null, true);
      const ctx1 = { t: WILDCARD, a: ACTION, o: ORIENT };
      const ctx1Key = AppCtxRoot.getKey(ctx1.t, ctx1.a, ctx1.o);
      const ctx2 = new AppCtx(ALT_TERM, ALT_ACTION);
      const ctx2Key = ctx2.key;
      // expect.assertions(3);

      // Act
      uut.setCtx(ctx1);
      uut.setAppCtx(ctx2);

      // Assert
      expect(uut._network._handlers.keys()).not.toContain(ctx1Key);
      expect(uut._network._handlers.keys()).not.toContain(ctx2Key);
    });

    it('should throw if setAppCtx called without an AppCtx', () => {
      // Assemble
      const uut = new Kernel();

      // Act
      const willThrow = () => uut.setAppCtx({});

      // Assert
      expect(willThrow).toThrow(`'appCtx' not an instance of AppCtx`);
    });
  });

  describe('provides ability to remove handlers for App Contexts', () => {
    it('should not add the same handler more than once for a given type of handling', () => {
      // Assemble
      const uut = new Kernel();
      const inlineConcrete = jest.fn().mockName('inline concrete handler');
      const asyncConcrete = jest.fn().mockName('async concrete handler');
      const interceptConcrete = jest
        .fn()
        .mockName('intercept concrete handler');
      const inlineWild = jest.fn().mockName('inline wild handler');
      const asyncWild = jest.fn().mockName('async wild handler');
      const interceptWild = jest.fn().mockName('intercept wild handler');
      const ac = new AppCtx(TERM, ACTION, ORIENT);
      uut.addInlineHandler(ac.unwrapCtx(), inlineConcrete);
      uut.addInlineHandler(ac.unwrapCtx(), inlineConcrete);
      uut.addAsyncHandler(ac.unwrapCtx(), asyncConcrete);
      uut.addAsyncHandler(ac.unwrapCtx(), asyncConcrete);
      uut.addInterceptHandler(ac.unwrapCtx(), interceptConcrete);
      uut.addInterceptHandler(ac.unwrapCtx(), interceptConcrete);
      uut.addInlineHandler({}, inlineWild);
      uut.addInlineHandler({}, inlineWild);
      uut.addAsyncHandler({}, asyncWild);
      uut.addAsyncHandler({}, asyncWild);
      uut.addInterceptHandler({}, interceptWild);
      uut.addInterceptHandler({}, interceptWild);
      expect.assertions(6);

      // Act
      uut.removeInlineHandler(ac.unwrapCtx(), inlineConcrete);
      uut.removeAsyncHandler(ac.unwrapCtx(), asyncConcrete);
      uut.removeInterceptHandler(ac.unwrapCtx(), interceptConcrete);
      uut.removeInlineHandler(ac.unwrapCtx(), inlineWild);
      uut.removeAsyncHandler(ac.unwrapCtx(), asyncWild);
      uut.removeInterceptHandler(ac.unwrapCtx(), interceptWild);
      uut.setAppCtx(ac);

      // Assert
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(inlineConcrete).not.toHaveBeenCalled();
          expect(asyncConcrete).not.toHaveBeenCalled();
          expect(interceptConcrete).not.toHaveBeenCalled();
          expect(inlineWild).not.toHaveBeenCalled();
          expect(asyncWild).not.toHaveBeenCalled();
          expect(interceptWild).not.toHaveBeenCalled();
          resolve();
        }, 30);
      });
    });

    it('should throw an Error if trying to remove a handler that is not a function', () => {
      // Assemble
      const uut = new Kernel();
      const ac = { t: TERM, a: ACTION, o: ORIENT };
      expect.assertions(6);

      // Act
      const inlineThrowsEmpty = () => uut.removeInlineHandler(ac);
      const inlineThrowsFunc = () => uut.removeInlineHandler(ac, {});
      const asyncThrowsEmpty = () => uut.removeAsyncHandler(ac);
      const asyncThrowsFunc = () => uut.removeAsyncHandler(ac, []);
      const interceptThrowsEmpty = () => uut.removeInterceptHandler(ac);
      const interceptThrowsFunc = () => uut.removeInterceptHandler(ac, true);

      // Assert
      expect(inlineThrowsEmpty).toThrow(
        'cannot do anything with missing handler',
      );
      expect(inlineThrowsFunc).toThrow('handler must be a function');
      expect(asyncThrowsEmpty).toThrow(
        'cannot do anything with missing handler',
      );
      expect(asyncThrowsFunc).toThrow('handler must be a function');
      expect(interceptThrowsEmpty).toThrow(
        'cannot do anything with missing handler',
      );
      expect(interceptThrowsFunc).toThrow('handler must be a function');
    });

    it('should ignore removing handlers on App Contexts which do not have handlers added', () => {
      // Assemble
      const uut = new Kernel();
      const ac = { t: TERM, a: ACTION, o: ORIENT };
      // Act
      // Assert
      expect(uut.removeInlineHandler(ac, () => 1)).toBe(uut);
      expect(uut.removeInlineHandler({}, () => 1)).toBe(uut);
      expect(uut.removeAsyncHandler(ac, () => 1)).toBe(uut);
      expect(uut.removeAsyncHandler({}, () => 1)).toBe(uut);
      expect(uut.removeInterceptHandler(ac, () => 1)).toBe(uut);
      expect(uut.removeInterceptHandler({}, () => 1)).toBe(uut);
    });
  });

  describe('provides ability to cascade App Contexts from handlers that return AppCtx', () => {
    it('should call next handler if handler returns an AppCtx', () => {
      // Assemble
      const uut = new Kernel();
      const one = new AppCtx(TERM, ACTION, ORIENT);
      const two = new AppCtx(TERM, ACTION, ALT_ORIENT);
      const three = new AppCtx(TERM, ALT_ACTION, ORIENT);
      const four = new AppCtx(TERM, ALT_ACTION, ALT_ORIENT);
      const five = new AppCtx(ALT_TERM, ACTION, ORIENT);
      const six = new AppCtx(ALT_TERM, ACTION, ALT_ORIENT);
      const seven = new AppCtx(ALT_TERM, ALT_ACTION, ORIENT);
      const eight = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);

      const interceptToAsync = jest
        .fn(() => two)
        .mockName('intercept-async handler');
      const asyncToInline = jest
        .fn(() => three)
        .mockName('async-inline handler');
      const asyncToAsync = jest.fn().mockName('async-async handler');
      const inlineToIntercept = jest
        .fn(() => four)
        .mockName('inline-intercept handler');
      const interceptToInline = jest
        .fn(() => five)
        .mockName('intercept-inline handler');
      const inlineToAsync = jest.fn(() => six).mockName('inline-async handler');
      const inlineToInline = jest.fn().mockName('inline-inline handler');
      const asyncToInterceptAndAsync = jest
        .fn(() => seven)
        .mockName('async-intercept+async handler');
      const interceptToIntercept = jest
        .fn(() => eight)
        .mockName('intercept-intercept handler');
      const interceptEnd = jest
        .fn()
        .mockName('intercept from intercept handler');

      uut.addInterceptHandler(one.unwrapCtx(), interceptToAsync);
      uut.addAsyncHandler(two.unwrapCtx(), asyncToInline);
      uut.addAsyncHandler(three.unwrapCtx(), asyncToAsync);
      uut.addInlineHandler(three.unwrapCtx(), inlineToIntercept);
      uut.addInterceptHandler(four.unwrapCtx(), interceptToInline);
      uut.addInlineHandler(five.unwrapCtx(), inlineToAsync);
      uut.addInlineHandler(six.unwrapCtx(), inlineToInline);
      uut.addAsyncHandler(six.unwrapCtx(), asyncToInterceptAndAsync);
      uut.addInterceptHandler(seven.unwrapCtx(), interceptToIntercept);
      uut.addInterceptHandler(eight.unwrapCtx(), interceptEnd);

      expect.assertions(10);

      // Act
      uut.setCtx(one.unwrapCtx());

      // Assert
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(interceptToAsync).toHaveBeenCalled();
          expect(asyncToInline).toHaveBeenCalled();
          expect(asyncToAsync).toHaveBeenCalled();
          expect(inlineToIntercept).toHaveBeenCalled();
          expect(interceptToInline).toHaveBeenCalled();
          expect(inlineToAsync).toHaveBeenCalled();
          expect(inlineToInline).toHaveBeenCalled();
          expect(asyncToInterceptAndAsync).toHaveBeenCalled();
          expect(interceptToIntercept).toHaveBeenCalled();
          expect(interceptEnd).toHaveBeenCalled();
          resolve();
        }, 300);
      });
    });
  });

  describe('canSetWildcard and clone', () => {
    it('exposes canSetWildcard from the constructor flag', () => {
      expect(new Kernel().canSetWildcard).toBe(false);
      expect(new Kernel(true).canSetWildcard).toBe(true);
    });

    it('clone inherits canSetWildcard and copies handlers onto a new network', () => {
      const uut = new Kernel();
      const handler = jest.fn();
      const trigram = { t: TERM, a: ACTION, o: ORIENT };
      uut.addInlineHandler(trigram, handler);
      const cloned = uut.clone();
      expect(cloned).toBeInstanceOf(Kernel);
      expect(cloned).not.toBe(uut);
      expect(cloned.canSetWildcard).toBe(false);
      expect(cloned._network).not.toBe(uut._network);
    });

    it('a cloned Kernel dispatches to its cloned handlers', () => {
      // in 0.18 a cloned kernel silently never ran handlers (its network had
      // no dispatch middleware); the Network owning execution fixes that
      const uut = new Kernel();
      const handler = jest.fn();
      const trigram = { t: TERM, a: ACTION, o: ORIENT };
      uut.addInlineHandler(trigram, handler);
      const cloned = uut.clone();

      cloned.setCtx(trigram, { [TERM]: { id: 7 } });

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler).toHaveBeenCalledTimes(1);
          expect(handler).toHaveBeenCalledWith(trigram, { [TERM]: { id: 7 } });
          resolve();
        }, 50);
      });
    });

    it('handlers added to a clone do not affect the original and vice versa', () => {
      const uut = new Kernel();
      const sharedHandler = jest.fn().mockName('shared');
      const cloneOnly = jest.fn().mockName('clone only');
      const originalOnly = jest.fn().mockName('original only');
      const trigram = { t: TERM, a: ACTION, o: ORIENT };
      uut.addInlineHandler(trigram, sharedHandler);
      const cloned = uut.clone();
      cloned.addInlineHandler(trigram, cloneOnly);
      uut.addInlineHandler(trigram, originalOnly);

      cloned.setCtx(trigram);

      return new Promise((resolve) => {
        setTimeout(() => {
          // the clone dispatches the copied handler plus its own addition
          expect(sharedHandler).toHaveBeenCalledTimes(1);
          expect(cloneOnly).toHaveBeenCalledTimes(1);
          // a handler added to the original after cloning never reaches the clone
          expect(originalOnly).not.toHaveBeenCalled();

          uut.setCtx(trigram);
          setTimeout(() => {
            // the original dispatches its own handlers, not the clone's
            expect(sharedHandler).toHaveBeenCalledTimes(2);
            expect(originalOnly).toHaveBeenCalledTimes(1);
            expect(cloneOnly).toHaveBeenCalledTimes(1);
            resolve();
          }, 50);
        }, 50);
      });
    });

    it('clone can override canSetWildcard', () => {
      expect(new Kernel(false).clone(true).canSetWildcard).toBe(true);
      expect(new Kernel(true).clone(false).canSetWildcard).toBe(false);
      // Explicit undefined must inherit, not force a false override
      expect(new Kernel(true).clone(undefined).canSetWildcard).toBe(true);
    });
  });

  describe('handler remove methods forward trigram bags', () => {
    it('removes handlers registered with mixed short/long trigram keys', () => {
      const uut = new Kernel();
      const intercept = jest.fn();
      const asyncH = jest.fn();
      const inline = jest.fn();
      const trigram = { term: TERM, a: ACTION, orient: ORIENT };
      uut
        .addInterceptHandler(trigram, intercept)
        .addAsyncHandler(trigram, asyncH)
        .addInlineHandler(trigram, inline);
      uut
        .removeInterceptHandler(
          { t: TERM, action: ACTION, o: ORIENT },
          intercept,
        )
        .removeAsyncHandler({ term: TERM, a: ACTION, orient: ORIENT }, asyncH)
        .removeInlineHandler({ t: TERM, a: ACTION, o: ORIENT }, inline);
      uut.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(intercept).not.toHaveBeenCalled();
          expect(asyncH).not.toHaveBeenCalled();
          expect(inline).not.toHaveBeenCalled();
          resolve();
        }, 50);
      });
    });
  });
});
