import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { default as TAODefault, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import * as hooks from '../src/hooks';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

const ALT_TERM = 'dude';
const ALT_ACTION = 'fistbump';
const ALT_ORIENT = 'bros';

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

describe('provides a set of react hooks for interacting with tao.js in functional components', () => {
  describe('useTaoContext', () => {
    it('should return a TAO Network', () => {
      const wrapper = ({ children }) => (
        <Provider TAO={TAO}>{children}</Provider>
      );
      const { result } = renderHook(() => hooks.useTaoContext(), { wrapper });

      expect(result.current).toBe(TAO);
      expect(result.current).toBeInstanceOf(Kernel);
    });
  });

  describe('useTaoInlineHandler', () => {
    it('should take a trigram + handler', () => {
      const wrapper = ({ children }) => (
        <Provider TAO={TAO}>{children}</Provider>
      );
      const { result } = renderHook(
        () => hooks.useTaoInlineHandler({ t: [TERM, ALT_TERM] }, NOOP),
        { wrapper }
      );

      expect(result.current).toBe(undefined);
    });
  });
});
