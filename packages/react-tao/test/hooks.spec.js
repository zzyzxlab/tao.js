import { renderHook, act } from '@testing-library/react-hooks';
import { default as TAODefault, Kernel } from '@tao.js/core';
// import { Context } from '../src/Provider';
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
      const { result } = renderHook(() => hooks.useTaoContext());

      expect(result.current).toBe(TAODefault);
      expect(result.current).toBeInstanceOf(Kernel);
    });
  });

  describe('useTaoInlineHandler', () => {
    it('should take a trigram + handler', () => {
      const { result } = renderHook(() =>
        hooks.useTaoInlineHandler({ t: [TERM, ALT_TERM] }, NOOP)
      );

      expect(result.current).toBe(undefined);
    });
  });
});
