import { WILDCARD, TIMEOUT_REJECT } from './constants';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import Kernel from './Kernel';
import { start } from 'repl';

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
        wildTermH
      );
      uut.addInlineHandler({ orient: ORIENT }, wildPartialH);
      uut.addInlineHandler({ term: TERM, o: ORIENT }, wildActionH);
      uut.addInlineHandler({ t: TERM, action: ACTION, o: '' }, wildOrientH);
      uut.addInlineHandler({ t: TERM, a: ACTION, o: ORIENT }, leafH);
      uut.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(leafH).toBeCalled();
          expect(wildH).toBeCalled();
          expect(wildTermH).toBeCalled();
          expect(wildActionH).toBeCalled();
          expect(wildOrientH).toBeCalled();
          expect(wildPartialH).toBeCalled();
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
        wildTermH
      );
      uut.addAsyncHandler({ term: TERM, o: ORIENT }, wildActionH);
      uut.addAsyncHandler({ t: TERM, action: ACTION, o: '' }, wildOrientH);
      uut.addAsyncHandler({ t: TERM, a: ACTION, o: ORIENT }, leafH);
      uut.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(leafH).toBeCalled();
          expect(wildH).toBeCalled();
          expect(wildTermH).toBeCalled();
          expect(wildActionH).toBeCalled();
          expect(wildOrientH).toBeCalled();
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
        wildTermH
      );
      uut.addInterceptHandler({ term: TERM, o: ORIENT }, wildActionH);
      uut.addInterceptHandler({ t: TERM, action: ACTION, o: '' }, wildOrientH);
      uut.setCtx({ t: TERM, a: ACTION, o: ORIENT });
      // Assert
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          expect(leafH).toBeCalled();
          expect(wildH).toBeCalled();
          expect(wildTermH).toBeCalled();
          expect(wildActionH).toBeCalled();
          expect(wildOrientH).toBeCalled();
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
        'cannot do anything with missing handler'
      );
      expect(inlineThrowsFunc).toThrow('handler must be a function');
      expect(asyncThrowsEmpty).toThrow(
        'cannot do anything with missing handler'
      );
      expect(asyncThrowsFunc).toThrow('handler must be a function');
      expect(interceptThrowsEmpty).toThrow(
        'cannot do anything with missing handler'
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
      return new Promise(resolve => {
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
          expect(indlineWildH).not.toBeCalled();
          expect(asyncWildH).not.toBeCalled();
          expect(interceptWildH).not.toBeCalled();
          resolve();
        }, 300);
      });
    });

    it('should allow setting wildcard App Contexts with a constructor setting', () => {
      // Assemble
      const uut = new Kernel(null, true);
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
          expect(indlineWildH).toBeCalled();
          expect(asyncWildH).toBeCalled();
          expect(interceptWildH).toBeCalled();
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
      expect(uut._handlers.keys()).toContain(ctx1Key);
      expect(uut._handlers.keys()).toContain(ctx2Key);
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
      expect(uut._handlers.keys()).not.toContain(ctx1Key);
      expect(uut._handlers.keys()).not.toContain(ctx2Key);
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
      return new Promise(resolve => {
        setTimeout(() => {
          expect(inlineConcrete).not.toBeCalled();
          expect(asyncConcrete).not.toBeCalled();
          expect(interceptConcrete).not.toBeCalled();
          expect(inlineWild).not.toBeCalled();
          expect(asyncWild).not.toBeCalled();
          expect(interceptWild).not.toBeCalled();
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
        'cannot do anything with missing handler'
      );
      expect(inlineThrowsFunc).toThrow('handler must be a function');
      expect(asyncThrowsEmpty).toThrow(
        'cannot do anything with missing handler'
      );
      expect(asyncThrowsFunc).toThrow('handler must be a function');
      expect(interceptThrowsEmpty).toThrow(
        'cannot do anything with missing handler'
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
      return new Promise(resolve => {
        setTimeout(() => {
          expect(interceptToAsync).toBeCalled();
          expect(asyncToInline).toBeCalled();
          expect(asyncToAsync).toBeCalled();
          expect(inlineToIntercept).toBeCalled();
          expect(interceptToInline).toBeCalled();
          expect(inlineToAsync).toBeCalled();
          expect(inlineToInline).toBeCalled();
          expect(asyncToInterceptAndAsync).toBeCalled();
          expect(interceptToIntercept).toBeCalled();
          expect(interceptEnd).toBeCalled();
          resolve();
        }, 300);
      });
    });
  });

  describe('converts a set of Contexts as a Promise Hook', () => {
    it('should return a function used for setting context when getting a Promise Hook', () => {
      // Assemble
      const uut = new Kernel();
      // Act
      const actual = uut.asPromiseHook({
        resolveOn: { t: TERM, a: ACTION, o: ORIENT },
        rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
      });
      // Assert
      expect(actual).toBeDefined();
      expect(actual).toBeInstanceOf(Function);
    });

    it('should throw an Error when creating a Promise Hook with no App Contexts', () => {
      // Assemble
      const uut = new Kernel();
      // Act
      const noArgsThrows = () => uut.asPromiseHook();
      const undefinedThrows = () =>
        uut.asPromiseHook({ resolveOn: undefined, rejectOn: undefined });
      const nullThrows = () =>
        uut.asPromiseHook({ resolveOn: null, rejectOn: null });
      const emptyThrows = () =>
        uut.asPromiseHook({ resolveOn: '', rejectOn: '' });
      // Assert
      expect(noArgsThrows).toThrow();
      expect(undefinedThrows).toThrow();
      expect(nullThrows).toThrow();
      expect(emptyThrows).toThrow();
    });

    it('should resolve a promise from a specified Concrete App Context', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(TERM, ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: { t: TERM, a: ACTION, o: ORIENT },
        rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
      });
      expect.assertions(1);
      // Act
      const resolvingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(resolvingPromise).resolves.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should reject a promise from a specified Concrete App Context', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT, [
        { a: 1 }
      ]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: { t: TERM, a: ACTION, o: ORIENT },
        rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
      });
      expect.assertions(1);
      // Act
      const rejectingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(rejectingPromise).rejects.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should resolve a promise from a list of Concrete App Contexts', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(TERM, ALT_ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: [{ t: TERM, a: ACTION, o: ORIENT }, expectedAc.unwrapCtx()],
        rejectOn: [
          { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT },
          { t: ALT_TERM, a: ALT_ACTION, o: ORIENT }
        ]
      });
      expect.assertions(1);
      // Act
      const resolvingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(resolvingPromise).resolves.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should reject a promise from a list of Concrete App Contexts', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(ALT_TERM, ALT_ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: [
          { t: TERM, a: ACTION, o: ORIENT },
          { t: TERM, a: ALT_ACTION, o: ORIENT }
        ],
        rejectOn: [
          { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT },
          expectedAc.unwrapCtx()
        ]
      });
      expect.assertions(1);
      // Act
      const rejectingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(rejectingPromise).rejects.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should resolve a promise from a specified Wild App Context', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(TERM, ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: { t: TERM, a: '', o: ORIENT },
        rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
      });
      expect.assertions(1);
      // Act
      const resolvingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(resolvingPromise).resolves.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should reject a promise from a specified Wild App Context', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT, [
        { a: 1 }
      ]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: { t: TERM, a: ACTION, o: ORIENT },
        rejectOn: { o: ALT_ORIENT }
      });
      expect.assertions(1);
      // Act
      const rejectingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(rejectingPromise).rejects.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should resolve a promise from a list of Wild App Contexts', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(TERM, ALT_ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: [{ t: TERM, o: ALT_ORIENT }, { a: ALT_ACTION, o: ORIENT }],
        rejectOn: [
          { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT },
          { t: TERM, a: ACTION, o: ALT_ORIENT }
        ]
      });
      expect.assertions(1);
      // Act
      const resolvingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(resolvingPromise).resolves.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should reject a promise from a list of Wild App Contexts', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(ALT_TERM, ACTION, ALT_ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: [
          { t: TERM, a: ACTION, o: ORIENT },
          { t: TERM, a: ALT_ACTION, o: ORIENT }
        ],
        rejectOn: [
          { t: ALT_TERM, a: ALT_ACTION },
          { t: ALT_TERM, o: ALT_ORIENT }
        ]
      });
      expect.assertions(1);
      // Act
      const rejectingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(rejectingPromise).rejects.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should reject a promise after a specified timeout', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(TERM, ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook(
        {
          resolveOn: { t: TERM, a: ACTION, o: ORIENT },
          rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
        },
        100
      );
      expect.assertions(1);
      // Act
      const rejectingPromise = promiseSetCtx({
        t: TERM,
        a: ALT_ACTION,
        o: ORIENT
      });
      // Assert
      return expect(rejectingPromise).rejects.toBe(TIMEOUT_REJECT);
    });

    it('should resolve a promise before a specified timeout', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(TERM, ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: { t: TERM, a: ACTION, o: ORIENT },
        rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
      });
      expect.assertions(1);
      // Act
      const resolvingPromise = promiseSetCtx(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        100
      );
      // Assert
      return expect(resolvingPromise).resolves.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should reject a promise before a specified timeout', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT, [
        { a: 1 }
      ]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook(
        {
          resolveOn: { t: TERM, a: ACTION, o: ORIENT },
          rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
        },
        100
      );
      expect.assertions(1);
      // Act
      const rejectingPromise = promiseSetCtx({
        t: ALT_TERM,
        a: ACTION,
        o: ORIENT
      });
      // Assert
      return expect(rejectingPromise).rejects.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should ignore a timeout value less than or equal to 0', () => {
      // Assemble
      const uut = new Kernel();
      const expectedAc = new AppCtx(TERM, ACTION, ORIENT, [{ a: 1 }]);
      const handler = jest
        .fn(() => expectedAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        handler
      );
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: { t: TERM, a: ACTION, o: ORIENT },
        rejectOn: { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT }
      });
      expect.assertions(1);
      // Act
      const resolvingPromise = promiseSetCtx(
        {
          t: ALT_TERM,
          a: ACTION,
          o: ORIENT
        },
        -1
      );
      // Assert
      return expect(resolvingPromise).resolves.toMatchObject({
        tao: expectedAc.unwrapCtx(),
        data: expectedAc.data
      });
    });

    it('should not add handlers involved with a Promise Hook until the Promise Context is set', async () => {
      // Assemble
      const uut = new Kernel();
      const resolveOnAc = new AppCtx(TERM, ACTION, ORIENT, [{ a: 1 }]);
      const triggeringAc = new AppCtx(ALT_TERM, ACTION, ORIENT);
      const rejectOnAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest
        .fn(() => resolveOnAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(triggeringAc.unwrapCtx(), handler);
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: resolveOnAc.unwrapCtx(),
        rejectOn: rejectOnAc.unwrapCtx()
      });
      // expect.assertions(1);
      // Act
      const preSetHandlers = new Map(uut._handlers);
      const resolvingPromise = promiseSetCtx(triggeringAc.unwrapCtx());
      const postSetHandlers = new Map(uut._handlers);
      await resolvingPromise;
      // Assert
      expect(preSetHandlers.size).toBe(1);
      expect(postSetHandlers.size).toBe(3);
      const preKeys = Array.from(preSetHandlers.keys());
      // console.log('preKeys:', preKeys);
      expect(preKeys).toContain(triggeringAc.key);
      expect(preKeys).not.toContain(resolveOnAc.key);
      expect(preKeys).not.toContain(rejectOnAc.key);
      const postKeys = Array.from(postSetHandlers.keys());
      // console.log('postKeys:', postKeys);
      expect(postKeys).toContain(triggeringAc.key);
      expect(postKeys).toContain(resolveOnAc.key);
      expect(postKeys).toContain(rejectOnAc.key);
    });

    it('should remove handlers involved with a Promise Hook once the Promise has settled', async () => {
      // Assemble
      const uut = new Kernel();
      const resolveOnAc = new AppCtx(TERM, ACTION, ORIENT, [{ a: 1 }]);
      const triggeringAc = new AppCtx(ALT_TERM, ACTION, ORIENT);
      const rejectOnAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest
        .fn(() => resolveOnAc)
        .mockName('intermediate handler');
      uut.addInlineHandler(triggeringAc.unwrapCtx(), handler);
      const promiseSetCtx = uut.asPromiseHook({
        resolveOn: resolveOnAc.unwrapCtx(),
        rejectOn: rejectOnAc.unwrapCtx()
      });
      // expect.assertions(1);
      // Act
      const result = await promiseSetCtx(triggeringAc.unwrapCtx());
      const postResolveHandlers = new Map(uut._handlers);
      const triggerHandlers = postResolveHandlers.get(triggeringAc.key);
      const resolveHandlers = postResolveHandlers.get(resolveOnAc.key);
      const rejectHandlers = postResolveHandlers.get(rejectOnAc.key);
      // Assert
      expect(triggerHandlers).toBeDefined();
      expect(triggerHandlers.inlineHandlers).toBeInstanceOf(Set);
      expect(triggerHandlers.inlineHandlers.size).toBe(1);
      expect(resolveHandlers).toBeDefined();
      expect(resolveHandlers.inlineHandlers).toBeInstanceOf(Set);
      expect(resolveHandlers.inlineHandlers.size).toBe(0);
      expect(rejectHandlers).toBeDefined();
      expect(rejectHandlers.inlineHandlers).toBeInstanceOf(Set);
      expect(rejectHandlers.inlineHandlers.size).toBe(0);
    });
  });
});
