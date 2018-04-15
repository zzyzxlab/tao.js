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
    it('should attach an inline handler', () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
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
  });

  describe('as Async handlers', () => {
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

    it('should call the async handler when asked to handle App Con', async () => {
      // Assemble
      const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
      const handler = jest.fn();
      uut.addAsyncHandler(handler);
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

    it('should call all async handlers when asked to handle App Con', async () => {
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
      await uut.handleAppCon(matchAc);
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
      await uut.handleAppCon(matchAc);
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
      uut.addAsyncHandler(handler);
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
  });

  describe('as Intercept handlers', () => {
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
