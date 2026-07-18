import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import * as hooks from '../src/hooks';

const TERM = 'colleague';
const ALT_TERM = 'dude';

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
  });

  describe('useTaoAsyncHandler', () => {
    it('should take a trigram + handler', () => {
      const { result } = renderHook(
        () => hooks.useTaoAsyncHandler({ t: [TERM, ALT_TERM] }, NOOP),
        { wrapper: withProvider },
      );

      expect(result.current).toBe(undefined);
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
  });

  describe('useTaoDataContext', () => {
    it('should return undefined when the named data context is missing', () => {
      const { result } = renderHook(() => hooks.useTaoDataContext('missing'), {
        wrapper: withProvider,
      });

      expect(result.current).toBe(undefined);
    });
  });
});
