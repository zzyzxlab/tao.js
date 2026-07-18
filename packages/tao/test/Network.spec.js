import { INTERCEPT, ASYNC, INLINE } from '../src/constants';
import AppCtx from '../src/AppCtx';
import Network from '../src/Network';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';
const TRIGRAM = { t: TERM, a: ACTION, o: ORIENT };

describe('Network', () => {
  it('provides a constructor', () => {
    expect(Network).toBeDefined();
    expect(new Network()).toBeInstanceOf(Network);
  });

  describe('middleware', () => {
    it('throws when use is given a non-function', () => {
      const n = new Network();
      expect(() => n.use(null)).toThrow('middleware must be a function');
      expect(() => n.use({})).toThrow('middleware must be a function');
    });

    it('ignores duplicate use of the same middleware function', () => {
      const n = new Network();
      const mw = jest.fn();
      n.use(mw);
      n.use(mw);
      n.addInlineHandler(TRIGRAM, () => {});
      n.setCtxControl(TRIGRAM, {}, {}, () => {});
      expect(mw).toHaveBeenCalledTimes(1);
    });

    it('stop removes registered middleware and is a no-op otherwise', () => {
      const n = new Network();
      const mw = jest.fn();
      n.use(mw);
      n.stop(mw);
      n.stop(() => {});
      n.addInlineHandler(TRIGRAM, () => {});
      n.setCtxControl(TRIGRAM, {}, {}, () => {});
      expect(mw).not.toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    it('copies intercept, async, and inline handlers onto a new Network', () => {
      const n = new Network();
      const intercept = jest.fn();
      const asyncH = jest.fn();
      const inline = jest.fn();
      n.addInterceptHandler(TRIGRAM, intercept);
      n.addAsyncHandler(TRIGRAM, asyncH);
      n.addInlineHandler(TRIGRAM, inline);

      const cloned = n.clone();
      expect(cloned).toBeInstanceOf(Network);
      expect(cloned).not.toBe(n);

      const seen = [];
      cloned.use((handler, appCtx, forward) => {
        seen.push(handler);
        return handler.handleAppCon(appCtx, forward, {});
      });
      cloned.setAppCtxControl(new AppCtx(TERM, ACTION, ORIENT));

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(intercept).toHaveBeenCalled();
          expect(asyncH).toHaveBeenCalled();
          expect(inline).toHaveBeenCalled();
          expect(seen.length).toBe(1);
          resolve();
        }, 50);
      });
    });
  });

  describe('setCtxControl / setAppCtxControl', () => {
    it('coerces a non-function forwardAppCtx to a no-op on setCtxControl', () => {
      const n = new Network();
      let forwardedType;
      n.use((handler, appCtx, forward) => {
        forwardedType = typeof forward;
        expect(() => forward(appCtx)).not.toThrow();
      });
      n.addInlineHandler(TRIGRAM, () => {});
      n.setCtxControl(TRIGRAM, {}, {}, 'not-a-function');
      expect(forwardedType).toBe('function');
    });

    it('throws when setAppCtxControl is not given an AppCtx', () => {
      const n = new Network();
      expect(() => n.setAppCtxControl({})).toThrow(
        "'appCtx' not an instance of AppCtx",
      );
    });

    it('coerces a missing forwardAppCtx to a no-op on setAppCtxControl', () => {
      const n = new Network();
      let forwardedType;
      n.use((handler, appCtx, forward) => {
        forwardedType = typeof forward;
      });
      n.addInlineHandler(TRIGRAM, () => {});
      n.setAppCtxControl(new AppCtx(TERM, ACTION, ORIENT));
      expect(forwardedType).toBe('function');
    });
  });

  describe('removeHandler', () => {
    it('removes a handler from all phases when type is omitted', () => {
      const n = new Network();
      const handler = jest.fn();
      n.addInterceptHandler(TRIGRAM, handler);
      n.addAsyncHandler(TRIGRAM, handler);
      n.addInlineHandler(TRIGRAM, handler);
      n.removeHandler(TRIGRAM, handler);

      n.use((h, appCtx, forward) => h.handleAppCon(appCtx, forward, {}));
      n.setAppCtxControl(new AppCtx(TERM, ACTION, ORIENT));

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler).not.toHaveBeenCalled();
          resolve();
        }, 50);
      });
    });

    it('removes only the named phase when type is provided', () => {
      const n = new Network();
      const handler = jest.fn();
      n.addInlineHandler(TRIGRAM, handler);
      n.addAsyncHandler(TRIGRAM, handler);
      n.removeHandler(TRIGRAM, handler, INLINE);

      n.use((h, appCtx, forward) => h.handleAppCon(appCtx, forward, {}));
      n.setAppCtxControl(new AppCtx(TERM, ACTION, ORIENT));

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler).toHaveBeenCalledTimes(1);
          resolve();
        }, 50);
      });
    });
  });
});
