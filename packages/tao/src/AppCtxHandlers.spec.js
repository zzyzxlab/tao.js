import { WILDCARD } from './constants';
import AppCtxRoot from './AppCtxRoot';
import AppCtx from './AppCtx';
import AppCtxHandlers from './AppCtxHandlers';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

const ALT_TERM = 'dude';
const ALT_ACTION = 'fistbump';
const ALT_ORIENT = 'bros';

jest.useFakeTimers();

/**
 * Passing this test means it inherits the tests from AppCtxRoot
 */
describe('AppCtxHandlers exports a class extending AppCtxRoot', () => {
  it('should provide a constructor', () => {
    // Assemble
    // Act
    // Assert
    expect(AppCtxHandlers).toBeDefined();
    expect(new AppCtxHandlers()).toBeInstanceOf(AppCtxHandlers);
    expect(new AppCtxHandlers()).not.toBeInstanceOf(Function);
  });

  it('should inherit from AppCtxRoot', () => {
    // Assemble
    // Act
    // Assert
    expect(new AppCtxHandlers()).toBeInstanceOf(AppCtxRoot);
  });

  it('should call super() in constructor', () => {
    // Assemble
    const expected = new AppCtxRoot();
    // Act
    const actual = new AppCtxHandlers();
    // Assert
    expect(actual).toEqualOn(expected);
  });
});

describe('AppCtxHandlers is used to attach handlers for Application Contexts', () => {
  describe('as Inline handlers', () => {
    it('should expose an inlineHandlers iterable property that is not the underlying collection', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      // Act
      // Assert
      expect(uut.inlineHandlers).toBeDefined();
      expect(uut.inlineHandlers).toBeIterable(true);
      expect(uut.inlineHandlers).not.toBeInstanceOf(Set);
      expect(uut.inlineHandlers).not.toBeInstanceOf(Array);
      expect(uut.inlineHandlers).not.toBeInstanceOf(Map);
    });

    it('should throw if handler is not a function', () => {
      // Assemble
      const uut = new AppCtxHandlers();
      // Act
      const willThrow = () => uut.addInlineHandler({});
      // Assert
      expect(willThrow).toThrow();
    });

    it('should attach an inline handler', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      // const beforeAttach = Array.from()
      // Act
      uut.addInlineHandler(handler);
      // Assert
      expect(uut.inlineHandlers).toContain(handler);
    });

    it('should attach multiple inline handlers', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      // Act
      uut.addInlineHandler(handler1);
      uut.addInlineHandler(handler2);
      uut.addInlineHandler(handler3);
      // Assert
      expect(uut.inlineHandlers).toContain(handler1);
      expect(uut.inlineHandlers).toContain(handler2);
      expect(uut.inlineHandlers).toContain(handler3);
    });

    it('should be able to remove an inline handler', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      // Act
      uut.addInlineHandler(handler);
      uut.removeInlineHandler(handler);
      // Assert
      expect(uut.inlineHandlers).not.toContain(handler);
    });

    it('should call the inline handler when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      uut.addInlineHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          t: TERM,
          a: ACTION,
          o: ORIENT
        }),
        {}
      );
    });

    it('should call all inline handlers when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn().mockName('handler_one');
      const handler2 = jest.fn().mockName('handler_two');
      const handler3 = jest.fn().mockName('handler_three');
      uut.addInlineHandler(handler1);
      uut.addInlineHandler(handler2);
      uut.addInlineHandler(handler3);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      const callingArg = expect.objectContaining({
        t: TERM,
        a: ACTION,
        o: ORIENT
      });
      // Act
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler1).toBeCalledWith(callingArg, {});
      expect(handler2).toBeCalledWith(callingArg, {});
      expect(handler3).toBeCalledWith(callingArg, {});
    });

    it('should not call a removed inline handler when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      uut.addInlineHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      uut.removeInlineHandler(handler);
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler).not.toBeCalled();
    });

    it('should not call all removed inline handlers when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn().mockName('handler_one');
      const handler2 = jest.fn().mockName('handler_two');
      const handler3 = jest.fn().mockName('handler_three');
      uut.addInlineHandler(handler1);
      uut.addInlineHandler(handler2);
      uut.addInlineHandler(handler3);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      const callingArg = expect.objectContaining({
        t: TERM,
        a: ACTION,
        o: ORIENT
      });
      // Act
      uut.removeInlineHandler(handler1);
      uut.removeInlineHandler(handler2);
      uut.removeInlineHandler(handler3);
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler1).not.toBeCalled();
      expect(handler2).not.toBeCalled();
      expect(handler3).not.toBeCalled();
    });

    it('should call setAppCtx if handler returns an AppCtx', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(nextAc);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInlineHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      // await
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).toBeCalledWith(nextAc);
    });

    it('should not call setAppCtx if handler returns nothing', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(null);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInlineHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).not.toBeCalled();
    });

    it('should not call setAppCtx if handler returns anything other than an AppCtx', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const fakeNextAc = { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT };
      const handler = jest.fn().mockReturnValue(fakeNextAc);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInlineHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).not.toBeCalled();
    });

    it('should prevent setAppCtx Errors from bubbling:', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(nextAc);
      const setAppCtx = jest
        .fn(() => {
          throw new Error('testing throw is caught');
        })
        .mockName('setAppCtx');
      uut.addInlineHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);

      // Act
      const wontThrow = async () => await uut.handleAppCon(matchAc, setAppCtx);

      // Assert
      expect(setAppCtx).toThrow();
      await expect(wontThrow()).resolves.not.toThrow();
      expect(handler).toBeCalled();
      expect(setAppCtx).toBeCalledWith(nextAc);
    });
  });

  describe('as Async handlers', () => {
    it('should expose an asyncHandlers iterable property that is not the underlying collection', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      // Act
      // Assert
      expect(uut.asyncHandlers).toBeDefined();
      expect(uut.asyncHandlers).toBeIterable(true);
      expect(uut.asyncHandlers).not.toBeInstanceOf(Set);
      expect(uut.asyncHandlers).not.toBeInstanceOf(Array);
      expect(uut.asyncHandlers).not.toBeInstanceOf(Map);
    });

    it('should throw if handler is not a function', () => {
      // Assemble
      const uut = new AppCtxHandlers();
      // Act
      const willThrow = () => uut.addAsyncHandler({});
      // Assert
      expect(willThrow).toThrow();
    });

    it('should attach an async handler', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      // Act
      uut.addAsyncHandler(handler);
      // Assert
      expect(uut.asyncHandlers).toContain(handler);
    });

    it('should attach multiple async handlers', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      // Act
      uut.addAsyncHandler(handler1);
      uut.addAsyncHandler(handler2);
      uut.addAsyncHandler(handler3);
      // Assert
      expect(uut.asyncHandlers).toContain(handler1);
      expect(uut.asyncHandlers).toContain(handler2);
      expect(uut.asyncHandlers).toContain(handler3);
    });

    it('should be able to remove an async handler', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      // Act
      uut.addAsyncHandler(handler);
      uut.removeAsyncHandler(handler);
      // Assert
      expect(uut.asyncHandlers).not.toContain(handler);
    });

    it('should call the async handler when asked to handle App Con without having to await', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      uut.addAsyncHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      uut.handleAppCon(matchAc);
      // Assert
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          t: TERM,
          a: ACTION,
          o: ORIENT
        }),
        {}
      );
    });

    it('should call all async handlers when asked to handle App Con without having to await', async () => {
      // Assemble
      expect.assertions(3);
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn().mockName('handler_one');
      const handler2 = jest
        .fn(() => {
          return new Promise(resolve =>
            setImmediate(() => {
              console.log('async 2');
              resolve();
            })
          );
        })
        .mockName('handler_two');
      const handler3 = jest
        .fn(() => {
          return new Promise(resolve =>
            setTimeout(() => {
              console.log('async 3');
              resolve();
            }, 1000)
          );
        })
        .mockName('handler_three');
      const inlineH = ({ t, a, o }, data) => {
        console.log(
          `-------- inline call with ['${t}', '${a}', '${o}'] ----------`
        );
      };
      uut.addInlineHandler(inlineH);
      uut.addAsyncHandler(handler1);
      uut.addAsyncHandler(handler2);
      uut.addAsyncHandler(handler3);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      const callingArg = expect.objectContaining({
        t: TERM,
        a: ACTION,
        o: ORIENT
      });
      // Act
      uut.handleAppCon(matchAc);
      jest.runAllTimers();
      // Assert
      expect(handler1).toBeCalledWith(callingArg, {});
      expect(handler2).toBeCalledWith(callingArg, {});
      expect(handler3).toBeCalledWith(callingArg, {});
    });

    it('should not call a removed async handler when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      uut.addAsyncHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      uut.removeAsyncHandler(handler);
      // await
      uut.handleAppCon(matchAc);
      // Assert
      expect(handler).not.toBeCalled();
    });

    it('should not call all removed async handlers when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn().mockName('handler_one');
      const handler2 = jest.fn().mockName('handler_two');
      const handler3 = jest.fn().mockName('handler_three');
      uut.addAsyncHandler(handler1);
      uut.addAsyncHandler(handler2);
      uut.addAsyncHandler(handler3);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      const callingArg = expect.objectContaining({
        t: TERM,
        a: ACTION,
        o: ORIENT
      });
      // Act
      uut.removeAsyncHandler(handler1);
      uut.removeAsyncHandler(handler2);
      uut.removeAsyncHandler(handler3);
      // await
      uut.handleAppCon(matchAc);
      // Assert
      expect(handler1).not.toBeCalled();
      expect(handler2).not.toBeCalled();
      expect(handler3).not.toBeCalled();
    });

    it('should call setAppCtx if handler returns an AppCtx', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(nextAc);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addAsyncHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      expect.assertions(1);
      // Act
      // await
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).toBeCalledWith(nextAc);
    });

    it('should not call setAppCtx if handler returns nothing', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(null);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addAsyncHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).not.toBeCalled();
    });

    it('should not call setAppCtx if handler returns anything other than an AppCtx', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const fakeNextAc = { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT };
      const handler = jest.fn().mockReturnValue(fakeNextAc);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addAsyncHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).not.toBeCalled();
    });

    it('should prevent setAppCtx Errors from bubbling:', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(nextAc);
      const setAppCtx = jest
        .fn(() => {
          throw new Error('testing throw is caught');
        })
        .mockName('setAppCtx');
      uut.addAsyncHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);

      // Act
      const wontThrow = async () => await uut.handleAppCon(matchAc, setAppCtx);

      // Assert
      expect(setAppCtx).toThrow();
      await expect(wontThrow()).resolves.not.toThrow();
      expect(handler).toBeCalled();
      expect(setAppCtx).toBeCalledWith(nextAc);
    });
  });

  describe('as Intercept handlers', () => {
    it('should expose an interceptHandlers iterable property that is not the underlying collection', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      // Act
      // Assert
      expect(uut.interceptHandlers).toBeDefined();
      expect(uut.interceptHandlers).toBeIterable(true);
      expect(uut.interceptHandlers).not.toBeInstanceOf(Set);
      expect(uut.interceptHandlers).not.toBeInstanceOf(Array);
      expect(uut.interceptHandlers).not.toBeInstanceOf(Map);
    });

    it('should throw if handler is not a function', () => {
      // Assemble
      const uut = new AppCtxHandlers();
      // Act
      const willThrow = () => uut.addInterceptHandler({});
      // Assert
      expect(willThrow).toThrow();
    });

    it('should attach an intercept handler', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      // Act
      uut.addInterceptHandler(handler);
      // Assert
      expect(uut.interceptHandlers).toContain(handler);
    });

    it('should attach multiple intercept handlers', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      // Act
      uut.addInterceptHandler(handler1);
      uut.addInterceptHandler(handler2);
      uut.addInterceptHandler(handler3);
      // Assert
      expect(uut.interceptHandlers).toContain(handler1);
      expect(uut.interceptHandlers).toContain(handler2);
      expect(uut.interceptHandlers).toContain(handler3);
    });

    it('should be able to remove an intercept handler', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      // Act
      uut.addInterceptHandler(handler);
      uut.removeInterceptHandler(handler);
      // Assert
      expect(uut.interceptHandlers).not.toContain(handler);
    });

    it('should call the intercept handler when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      uut.addInterceptHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          t: TERM,
          a: ACTION,
          o: ORIENT
        }),
        {}
      );
    });

    it('should call all intercept handlers when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn().mockName('handler_one');
      const handler2 = jest.fn().mockName('handler_two');
      const handler3 = jest.fn().mockName('handler_three');
      uut.addInterceptHandler(handler1);
      uut.addInterceptHandler(handler2);
      uut.addInterceptHandler(handler3);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      const callingArg = expect.objectContaining({
        t: TERM,
        a: ACTION,
        o: ORIENT
      });
      // Act
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler1).toBeCalledWith(callingArg, {});
      expect(handler2).toBeCalledWith(callingArg, {});
      expect(handler3).toBeCalledWith(callingArg, {});
    });

    it('should not call a removed intercept handler when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      uut.addInterceptHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      uut.removeInterceptHandler(handler);
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler).not.toBeCalled();
    });

    it('should not call all removed intercept handlers when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler1 = jest.fn().mockName('handler_one');
      const handler2 = jest.fn().mockName('handler_two');
      const handler3 = jest.fn().mockName('handler_three');
      uut.addInterceptHandler(handler1);
      uut.addInterceptHandler(handler2);
      uut.addInterceptHandler(handler3);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      const callingArg = expect.objectContaining({
        t: TERM,
        a: ACTION,
        o: ORIENT
      });
      // Act
      uut.removeInterceptHandler(handler1);
      uut.removeInterceptHandler(handler2);
      uut.removeInterceptHandler(handler3);
      await uut.handleAppCon(matchAc);
      // Assert
      expect(handler1).not.toBeCalled();
      expect(handler2).not.toBeCalled();
      expect(handler3).not.toBeCalled();
    });

    it('should call setAppCtx if handler returns an AppCtx', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(nextAc);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInterceptHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).toBeCalledWith(nextAc);
    });

    it('should not call setAppCtx if handler returns nothing', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(null);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInterceptHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).not.toBeCalled();
    });

    it('should not call setAppCtx if handler returns anything other than an AppCtx', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const fakeNextAc = { t: ALT_TERM, a: ALT_ACTION, o: ALT_ORIENT };
      const handler = jest.fn().mockReturnValue(fakeNextAc);
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInterceptHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).not.toBeCalled();
    });

    it('should prevent setAppCtx Errors from bubbling:', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(nextAc);
      const setAppCtx = jest
        .fn(() => {
          throw new Error('testing throw is caught');
        })
        .mockName('setAppCtx');
      uut.addInterceptHandler(handler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);

      // Act
      const wontThrow = async () => await uut.handleAppCon(matchAc, setAppCtx);

      // Assert
      expect(setAppCtx).toThrow();
      await expect(wontThrow()).resolves.not.toThrow();
      expect(handler).toBeCalled();
      expect(setAppCtx).toBeCalledWith(nextAc);
    });

    it('should not call inlineHander if handler returns truthy value', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(nextAc);
      const inlineHandler = jest.fn().mockName('inlineHandler');
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInterceptHandler(handler);
      uut.addInlineHandler(inlineHandler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      // expect(setAppCtx).toBeCalledWith(nextAc);
      expect(inlineHandler).not.toBeCalled();
    });

    it('should call inlineHandler if handler returns falsey value', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
      const handler = jest.fn().mockReturnValue(null);
      const inlineHandler = jest.fn().mockName('inlineHandler');
      const setAppCtx = jest.fn().mockName('setAppCtx');
      uut.addInterceptHandler(handler);
      uut.addInlineHandler(inlineHandler);
      const matchAc = new AppCtx(TERM, ACTION, ORIENT);
      // Act
      await uut.handleAppCon(matchAc, setAppCtx);
      // Assert
      expect(setAppCtx).not.toBeCalled();
      expect(inlineHandler).toBeCalled();
    });
  });
});

describe('AppCtxHandlers can be linked to create a tree of handlers', () => {
  it('should require a Leaf Handler to be an AppCtxHandler', () => {
    // Assemble
    const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
    // const nextAc = new AppCtx(ALT_TERM, ALT_ACTION, ALT_ORIENT);
    // const handler = jest.fn().mockReturnValue(null);
    // const inlineHandler = jest.fn().mockName('inlineHandler');
    // const setAppCtx = jest.fn().mockName('setAppCtx');
    // uut.addInterceptHandler(handler);
    // uut.addInlineHandler(inlineHandler);
    // const matchAc = new AppCtx(TERM, ACTION, ORIENT);
    // Act
    // Assert
    expect(() => uut.addLeafHandler({})).toThrow(
      "'leafAch' is not an instance of AppCtxHandlers"
    );
  });

  it('should ignore adding a Leaf Handler to a Concrete AppCtxHandlers', () => {
    // Assemble
    const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
    const ach = new AppCtxHandlers(ALT_TERM, ALT_ACTION, ALT_ORIENT);
    // Act
    uut.addLeafHandler(ach);
    // Assert
    expect(uut._leafAppConHandlers).not.toContain(ach);
  });

  it('should ignore adding a Wildcard AppCtxHandlers as a Laef Handler', () => {
    // Assemble
    const uut = new AppCtxHandlers(WILDCARD, WILDCARD, WILDCARD);
    const wildTerm = new AppCtxHandlers(WILDCARD, ACTION, ORIENT);
    const wildAction = new AppCtxHandlers(TERM, WILDCARD, ORIENT);
    const wildOrient = new AppCtxHandlers(TERM, ACTION, WILDCARD);
    // Act
    uut.addLeafHandler(wildTerm);
    uut.addLeafHandler(wildAction);
    uut.addLeafHandler(wildOrient);
    // Assert
    expect(uut._leafAppConHandlers).not.toContain(wildTerm);
    expect(uut._leafAppConHandlers).not.toContain(wildAction);
    expect(uut._leafAppConHandlers).not.toContain(wildOrient);
  });

  it('should ignore adding Leaf Handlers that cannot match', () => {
    // Assemble
    const uutTerm = new AppCtxHandlers(TERM, WILDCARD, WILDCARD);
    const uutAction = new AppCtxHandlers(WILDCARD, ACTION, WILDCARD);
    const uutOrient = new AppCtxHandlers(WILDCARD, WILDCARD, ORIENT);
    const leaf = new AppCtxHandlers(ALT_TERM, ALT_ACTION, ALT_ORIENT);

    // ACT
    uutTerm.addLeafHandler(leaf);
    uutAction.addLeafHandler(leaf);
    uutOrient.addLeafHandler(leaf);

    // Assert
    expect(uutTerm._leafAppConHandlers).not.toContain(leaf);
    expect(uutAction._leafAppConHandlers).not.toContain(leaf);
    expect(uutOrient._leafAppConHandlers).not.toContain(leaf);
  });

  it('should add a Concrete Leaf Handler to a Wildcard Handler and populate the Leaf Handlers', () => {
    // Assemble
    const uut = new AppCtxHandlers(WILDCARD, WILDCARD, WILDCARD);
    const leaf = new AppCtxHandlers(TERM, ACTION, ORIENT);
    const interceptH = jest.fn().mockName('intercept handler');
    const asyncH = jest.fn().mockName('async handler');
    const inlineH = jest.fn().mockName('inline handler');
    uut.addInterceptHandler(interceptH);
    uut.addAsyncHandler(asyncH);
    uut.addInlineHandler(inlineH);

    // Act
    uut.addLeafHandler(leaf);

    // Assert
    expect(uut._leafAppConHandlers).toContain(leaf);
    expect(uut._intercept).toContain(interceptH);
    expect(leaf._intercept).toContain(interceptH);
    expect(uut._async).toContain(asyncH);
    expect(leaf._async).toContain(asyncH);
    expect(uut._inline).toContain(inlineH);
    expect(leaf._inline).toContain(inlineH);
  });

  it('should add multiple Concrete Leaf Handlers to a Wildcard Handler that matches', () => {
    // Assemble
    const uut = new AppCtxHandlers(WILDCARD, ACTION, ORIENT);
    const leaf1 = new AppCtxHandlers(TERM, ACTION, ORIENT);
    const leaf2 = new AppCtxHandlers(ALT_TERM, ACTION, ORIENT);
    const leaves = [leaf1, leaf2];
    const interceptH = jest.fn().mockName('intercept handler');
    const asyncH = jest.fn().mockName('async handler');
    const inlineH = jest.fn().mockName('inline handler');
    uut.addInterceptHandler(interceptH);
    uut.addAsyncHandler(asyncH);
    uut.addInlineHandler(inlineH);

    // Act
    uut.addLeafHandlers(leaves);

    // Assert
    expect(uut._leafAppConHandlers).toContain(leaf1);
    expect(uut._leafAppConHandlers).toContain(leaf2);
    expect(uut._intercept).toContain(interceptH);
    expect(leaf1._intercept).toContain(interceptH);
    expect(leaf2._intercept).toContain(interceptH);
    expect(uut._async).toContain(asyncH);
    expect(leaf1._async).toContain(asyncH);
    expect(leaf2._async).toContain(asyncH);
    expect(uut._inline).toContain(inlineH);
    expect(leaf1._inline).toContain(inlineH);
    expect(leaf2._inline).toContain(inlineH);
  });

  it('should only add the same Leaf Handler once', () => {
    // Assemble
    const uut = new AppCtxHandlers();
    const leaf = new AppCtxHandlers(TERM, ACTION, ORIENT);
    const interceptH = jest.fn().mockName('intercept handler');
    const asyncH = jest.fn().mockName('async handler');
    const inlineH = jest.fn().mockName('inline handler');
    uut.addInterceptHandler(interceptH);
    uut.addAsyncHandler(asyncH);
    uut.addInlineHandler(inlineH);

    // Act
    uut.addLeafHandler(leaf);
    uut.addLeafHandler(leaf);

    // Assert
    expect(uut._leafAppConHandlers).toContain(leaf);
    expect(uut._leafAppConHandlers.size).toBe(1);
    expect(uut._intercept).toContain(interceptH);
    expect(leaf._intercept).toContain(interceptH);
    expect(leaf._intercept.size).toBe(1);
    expect(uut._async).toContain(asyncH);
    expect(leaf._async).toContain(asyncH);
    expect(leaf._async.size).toBe(1);
    expect(uut._inline).toContain(inlineH);
    expect(leaf._inline).toContain(inlineH);
    expect(leaf._inline.size).toBe(1);
  });

  it('should treat adding Multiple with non-Iterable as adding Single Leaf Handler', () => {
    // Assemble
    const uut = new AppCtxHandlers();
    const leaf = new AppCtxHandlers(TERM, ACTION, ORIENT);
    const interceptH = jest.fn().mockName('intercept handler');
    const asyncH = jest.fn().mockName('async handler');
    const inlineH = jest.fn().mockName('inline handler');
    uut.addInterceptHandler(interceptH);
    uut.addAsyncHandler(asyncH);
    uut.addInlineHandler(inlineH);

    // Act
    uut.addLeafHandlers(leaf);

    // Assert
    expect(uut._leafAppConHandlers).toContain(leaf);
    expect(uut._intercept).toContain(interceptH);
    expect(leaf._intercept).toContain(interceptH);
    expect(uut._async).toContain(asyncH);
    expect(leaf._async).toContain(asyncH);
    expect(uut._inline).toContain(inlineH);
    expect(leaf._inline).toContain(inlineH);
  });

  it('should add Handlers to Leaves when adding to Wildcard', () => {
    // Assemble
    const uut = new AppCtxHandlers();
    const leaf = new AppCtxHandlers(TERM, ACTION, ORIENT);
    const interceptH = jest.fn().mockName('intercept handler');
    const asyncH = jest.fn().mockName('async handler');
    const inlineH = jest.fn().mockName('inline handler');

    // Act
    uut.addLeafHandler(leaf);
    uut.addInterceptHandler(interceptH);
    uut.addAsyncHandler(asyncH);
    uut.addInlineHandler(inlineH);

    // Assert
    expect(uut._leafAppConHandlers).toContain(leaf);
    expect(uut._intercept).toContain(interceptH);
    expect(leaf._intercept).toContain(interceptH);
    expect(uut._async).toContain(asyncH);
    expect(leaf._async).toContain(asyncH);
    expect(uut._inline).toContain(inlineH);
    expect(leaf._inline).toContain(inlineH);
  });

  it('should remove Handlers from Leaves when removing from Wildcard', () => {
    // Assemble
    const uut = new AppCtxHandlers();
    const leaf = new AppCtxHandlers(TERM, ACTION, ORIENT);
    const preInterceptH = jest.fn().mockName('intercept handler pre-leaf');
    const preAsyncH = jest.fn().mockName('async handler pre-leaf');
    const preInlineH = jest.fn().mockName('inline handler pre-leaf');
    const postInterceptH = jest.fn().mockName('intercept handler post-leaf');
    const postAsyncH = jest.fn().mockName('async handler post-leaf');
    const postInlineH = jest.fn().mockName('inline handler post-leaf');
    uut.addInterceptHandler(preInterceptH);
    uut.addAsyncHandler(preAsyncH);
    uut.addInlineHandler(preInlineH);
    uut.addLeafHandler(leaf);
    uut.addInterceptHandler(postInterceptH);
    uut.addAsyncHandler(postAsyncH);
    uut.addInlineHandler(postInlineH);

    // Act
    uut.removeInterceptHandler(preInterceptH);
    uut.removeInterceptHandler(postInterceptH);
    uut.removeAsyncHandler(preAsyncH);
    uut.removeAsyncHandler(postAsyncH);
    uut.removeInlineHandler(preInlineH);
    uut.removeInlineHandler(postInlineH);

    // Assert
    expect(uut._leafAppConHandlers).toContain(leaf);
    expect(leaf._intercept).not.toContain(preInterceptH);
    expect(leaf._intercept).not.toContain(postInterceptH);
    expect(leaf._async).not.toContain(preAsyncH);
    expect(leaf._async).not.toContain(postAsyncH);
    expect(leaf._inline).not.toContain(preInlineH);
    expect(leaf._inline).not.toContain(postInlineH);
  });
});
