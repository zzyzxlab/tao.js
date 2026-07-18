import React from 'react';
import { renderHook } from '@testing-library/react';
import { Kernel } from '@tao.js/core';
import Provider, { Context } from '../src/Provider';
import * as hooks from '../src/hooks';

const TERM = 'colleague';
const ALT_TERM = 'dude';
const ACTION = 'hug';
const ORIENT = 'justfriends';
const TRIGRAM = { t: TERM, a: ACTION, o: ORIENT };

let TAO = null;
function initTAO() {
  TAO = new Kernel();
}
function clearTAO() {
  TAO = null;
}

beforeEach(initTAO);
afterEach(clearTAO);

const NOOP = () => {};

const withProvider = ({ children }) => (
  <Provider TAO={TAO}>{children}</Provider>
);

function expectRegisterAndCleanup(hookFn, addName, removeName) {
  const handler = jest.fn();
  const addSpy = jest.spyOn(TAO, addName);
  const removeSpy = jest.spyOn(TAO, removeName);

  const { unmount } = renderHook(() => hookFn(TRIGRAM, handler, [handler]), {
    wrapper: withProvider,
  });

  expect(addSpy).toHaveBeenCalled();
  expect(
    addSpy.mock.calls.some(
      ([trigram, h]) =>
        h === handler &&
        (trigram.t === TERM || trigram.term === TERM) &&
        (trigram.a === ACTION || trigram.action === ACTION),
    ),
  ).toBe(true);

  unmount();
  expect(removeSpy).toHaveBeenCalled();
  expect(
    removeSpy.mock.calls.some(
      ([trigram, h]) =>
        h === handler &&
        (trigram.t === TERM || trigram.term === TERM) &&
        (trigram.a === ACTION || trigram.action === ACTION),
    ),
  ).toBe(true);

  addSpy.mockRestore();
  removeSpy.mockRestore();
}

describe('provides a set of react hooks for interacting with tao.js in functional components', () => {
  describe('useTaoContext', () => {
    it('should return a TAO Network', () => {
      const { result } = renderHook(() => hooks.useTaoContext(), {
        wrapper: withProvider,
      });

      expect(result.current).toBe(TAO);
      expect(result.current).toBeInstanceOf(Kernel);
    });
  });

  describe('useTaoInlineHandler', () => {
    it('should take a trigram + handler', () => {
      const { result } = renderHook(
        () => hooks.useTaoInlineHandler({ t: [TERM, ALT_TERM] }, NOOP),
        { wrapper: withProvider },
      );

      expect(result.current).toBe(undefined);
    });

    it('registers and unregisters the inline handler on mount/unmount', () => {
      expectRegisterAndCleanup(
        hooks.useTaoInlineHandler,
        'addInlineHandler',
        'removeInlineHandler',
      );
    });
  });

  describe('useTaoAsyncHandler', () => {
    it('should take a trigram + handler', () => {
      const { result } = renderHook(
        () => hooks.useTaoAsyncHandler({ t: [TERM, ALT_TERM] }, NOOP),
        { wrapper: withProvider },
      );

      expect(result.current).toBe(undefined);
    });

    it('registers and unregisters the async handler on mount/unmount', () => {
      expectRegisterAndCleanup(
        hooks.useTaoAsyncHandler,
        'addAsyncHandler',
        'removeAsyncHandler',
      );
    });
  });

  describe('useTaoInterceptHandler', () => {
    it('should take a trigram + handler', () => {
      const { result } = renderHook(
        () => hooks.useTaoInterceptHandler({ t: [TERM, ALT_TERM] }, NOOP),
        { wrapper: withProvider },
      );

      expect(result.current).toBe(undefined);
    });

    it('registers and unregisters the intercept handler on mount/unmount', () => {
      expectRegisterAndCleanup(
        hooks.useTaoInterceptHandler,
        'addInterceptHandler',
        'removeInterceptHandler',
      );
    });
  });

  describe('useTaoData / useTaoDataContext', () => {
    it('should return undefined when the named data layer is missing', () => {
      const { result } = renderHook(() => hooks.useTaoData('missing'), {
        wrapper: withProvider,
      });

      expect(result.current).toBe(undefined);
    });

    it('useTaoDataContext aliases useTaoData for named lookup', () => {
      const { result } = renderHook(() => hooks.useTaoDataContext('missing'), {
        wrapper: withProvider,
      });

      expect(result.current).toBe(undefined);
    });

    it('should return undefined for nearest when no DataHandler ancestors exist', () => {
      const { result } = renderHook(() => hooks.useTaoData(), {
        wrapper: withProvider,
      });

      expect(result.current).toBe(undefined);
    });

    it('treats empty string name as nearest layer', () => {
      const DataHandler = require('../src/DataHandler').default;
      const { result } = renderHook(() => hooks.useTaoData(''), {
        wrapper: ({ children }) => (
          <Provider TAO={TAO}>
            <DataHandler
              name="user"
              term={TERM}
              action={ACTION}
              orient={ORIENT}
              default={{ id: 1 }}
            >
              {children}
            </DataHandler>
          </Provider>
        ),
      });

      expect(result.current).toEqual({ id: 1 });
    });

    it('returns undefined when data layers context value is null', () => {
      const { DataLayerContext } = require('../src/DataLayerContext');
      const { result } = renderHook(() => hooks.useTaoData('x'), {
        wrapper: ({ children }) => (
          <DataLayerContext.Provider value={null}>
            {children}
          </DataLayerContext.Provider>
        ),
      });

      expect(result.current).toBe(undefined);
    });
  });
});
