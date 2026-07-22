import { INLINE } from '../src/constants';
import AppCtx from '../src/AppCtx';
import AppCtxRoot from '../src/AppCtxRoot';
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

  describe('enter', () => {
    it('throws when not given an AppCtx', () => {
      const n = new Network();
      expect(() => n.enter({})).toThrow("'appCtx' not an instance of AppCtx");
      expect(() => n.enter()).toThrow("'appCtx' not an instance of AppCtx");
    });

    it('dispatches registered handlers for the entered AppCtx', async () => {
      const n = new Network();
      const intercept = jest.fn();
      const asyncH = jest.fn();
      const inline = jest.fn();
      n.addInterceptHandler(TRIGRAM, intercept);
      n.addAsyncHandler(TRIGRAM, asyncH);
      n.addInlineHandler(TRIGRAM, inline);

      n.enter(new AppCtx(TERM, ACTION, ORIENT, { [TERM]: { id: 1 } }));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(intercept).toHaveBeenCalledTimes(1);
      expect(asyncH).toHaveBeenCalledTimes(1);
      expect(inline).toHaveBeenCalledTimes(1);
      expect(inline).toHaveBeenCalledWith(
        { t: TERM, a: ACTION, o: ORIENT },
        { [TERM]: { id: 1 } },
      );
    });

    it('lazily creates concrete handlers but never creates wildcard handlers', () => {
      const n = new Network();
      const concrete = AppCtxRoot.getKey(TERM, ACTION, ORIENT);
      const wildcard = AppCtxRoot.getKey('', ACTION, ORIENT);
      const onDispatch = jest.fn();

      n.decorate({ onDispatch });
      n.enter(new AppCtx(TERM, ACTION, ORIENT));
      n.enter(new AppCtx('', ACTION, ORIENT));

      expect(n._handlers.has(concrete)).toBe(true);
      expect(n._handlers.has(wildcard)).toBe(false);
      // dispatch must not run for unset wildcards (would get an undefined handler)
      expect(onDispatch).toHaveBeenCalledTimes(1);
      expect(onDispatch.mock.calls[0][2]).toBe(n._handlers.get(concrete));
    });

    it('attaches later wildcards to every prior leaf sharing an axis', async () => {
      const n = new Network();
      const h1 = jest.fn();
      const h2 = jest.fn();
      const wild = jest.fn();
      const altAction = 'handshake';

      n.addInlineHandler(TRIGRAM, h1);
      n.addInlineHandler({ t: TERM, a: altAction, o: ORIENT }, h2);
      // wildcard added after leaves — must index both leaves under term
      n.addInlineHandler({ t: TERM }, wild);

      n.enter(new AppCtx(TERM, ACTION, ORIENT));
      n.enter(new AppCtx(TERM, altAction, ORIENT));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
      expect(wild).toHaveBeenCalledTimes(2);
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

      cloned.enter(new AppCtx(TERM, ACTION, ORIENT));

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(intercept).toHaveBeenCalledTimes(1);
          expect(asyncH).toHaveBeenCalledTimes(1);
          expect(inline).toHaveBeenCalledTimes(1);
          resolve();
        }, 50);
      });
    });

    it('does not copy decorations into the cloned network', () => {
      const n = new Network();
      const onDispatch = jest.fn();
      n.decorate({ onDispatch });

      const cloned = n.clone();
      cloned.addInlineHandler(TRIGRAM, () => {});
      cloned.enter(new AppCtx(TERM, ACTION, ORIENT));

      expect(onDispatch).not.toHaveBeenCalled();
    });

    it('carries the wildcard policy onto the cloned network', async () => {
      const wildNetwork = new Network(true);
      const seen = [];
      const cloned = wildNetwork.clone();
      cloned.decorate({ onDispatch: (ac) => seen.push(ac.key) });
      cloned.addInlineHandler(TRIGRAM, () => new AppCtx(TERM));
      cloned.addInlineHandler({ t: TERM }, jest.fn());

      cloned.enter(new AppCtx(TERM, ACTION, ORIENT));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(seen).toEqual([`${TERM}|${ACTION}|${ORIENT}`, `${TERM}|*|*`]);
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

      n.enter(new AppCtx(TERM, ACTION, ORIENT));

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

      n.enter(new AppCtx(TERM, ACTION, ORIENT));

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler).toHaveBeenCalledTimes(1);
          resolve();
        }, 50);
      });
    });
  });
});
