import React, { Component } from 'react';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import { AppCtx, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import createContextHandler from '../src/createContextHandler';

const TERM = 'User';
const ACTION = 'Enter';
const ORIENT = 'Portal';

describe('createContextHandler', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  describe('is a higher order React component utility', () => {
    it('should be a Function', () => {
      expect(createContextHandler).toBeDefined();
      expect(createContextHandler).toBeInstanceOf(Function);
    });

    it('should return a Provider/Consumer pair when called', () => {
      const actual = createContextHandler();

      expect(actual).toBeDefined();
      expect(actual).toEqual(
        expect.objectContaining({
          Provider: expect.any(Function),
          Consumer: expect.any(Object),
        }),
      );
    });

    it('throws when handler is present but not a function', () => {
      expect(() => createContextHandler({}, 'not-a-fn')).toThrow(
        /handler` must be a function/,
      );
    });
  });

  describe('provides a Context for developing React Components that use tao.js handlers', () => {
    it('should return an object with a Provider React Component', () => {
      const actual = createContextHandler();

      expect(actual.Provider).toBeDefined();
      expect(new actual.Provider()).toBeInstanceOf(actual.Provider);
      expect(new actual.Provider()).not.toBeInstanceOf(Function);
      expect(new actual.Provider()).toBeInstanceOf(Component);
    });

    it('should return an object with a Consumer', () => {
      const actual = createContextHandler();

      expect(actual.Consumer).toBeDefined();
      expect(
        typeof actual.Consumer === 'object' ||
          typeof actual.Consumer === 'function',
      ).toBe(true);
      expect(<actual.Consumer>{() => null}</actual.Consumer>).toBeTruthy();
    });

    it('initializes state from a defaultValue factory function', () => {
      const { Provider: CtxProvider, Consumer } = createContextHandler(
        { term: TERM, action: ACTION, orient: ORIENT },
        null,
        () => ({ fromFactory: true }),
      );

      const { getByTestId } = render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <Consumer>
              {(value) => (
                <div data-testid="out">
                  {value && value.fromFactory ? 'yes' : 'no'}
                </div>
              )}
            </Consumer>
          </CtxProvider>
        </Provider>,
      );

      expect(getByTestId('out').textContent).toBe('yes');
    });

    it('defaults state to {} when defaultValue is omitted', () => {
      const { Provider: CtxProvider, Consumer } = createContextHandler({
        term: TERM,
        action: ACTION,
        orient: ORIENT,
      });

      const { getByTestId } = render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <Consumer>
              {(value) => (
                <div data-testid="out">
                  {value && Object.keys(value).length === 0 ? 'empty' : 'full'}
                </div>
              )}
            </Consumer>
          </CtxProvider>
        </Provider>,
      );

      expect(getByTestId('out').textContent).toBe('empty');
    });

    it('updates consumer state from handler return value', async () => {
      const { Provider: CtxProvider, Consumer } = createContextHandler(
        { term: TERM, action: ACTION, orient: ORIENT },
        (tao, data) => data.User,
        { id: null },
      );

      const { getByTestId } = render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <Consumer>
              {(value) => <div data-testid="out">{value && value.id}</div>}
            </Consumer>
          </CtxProvider>
        </Provider>,
      );

      act(() => {
        TAO.setAppCtx(
          new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'u-7' } }),
        );
      });

      await waitFor(() => {
        expect(getByTestId('out').textContent).toBe('u-7');
      });
    });

    it('ignores a return value for state when the set callback was used', async () => {
      const { Provider: CtxProvider, Consumer } = createContextHandler(
        { term: TERM, action: ACTION, orient: ORIENT },
        (tao, data, set) => {
          set({ id: data.User.id, fromSet: true });
          return { id: 'from-return', fromSet: false };
        },
        { id: 'seed' },
      );

      const { getByTestId } = render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <Consumer>
              {(value) => (
                <div data-testid="out">{`${value.id}:${value.fromSet}`}</div>
              )}
            </Consumer>
          </CtxProvider>
        </Provider>,
      );

      act(() => {
        TAO.setAppCtx(
          new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'u-set' } }),
        );
      });

      await waitFor(() => {
        expect(getByTestId('out').textContent).toBe('u-set:true');
      });
    });

    it('supports the set callback and clearing state with null', async () => {
      const { Provider: CtxProvider, Consumer } = createContextHandler(
        { term: TERM, action: ACTION, orient: ORIENT },
        (tao, data, set) => {
          if (data.User && data.User.clear) {
            set(null);
            return;
          }
          set({ id: data.User.id, extra: true });
        },
        { id: 'seed', stale: true },
      );

      const { getByTestId } = render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <Consumer>
              {(value) => (
                <div data-testid="out">
                  {`${value.id}:${value.extra}:${value.stale}`}
                </div>
              )}
            </Consumer>
          </CtxProvider>
        </Provider>,
      );

      act(() => {
        TAO.setAppCtx(
          new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'u-9' } }),
        );
      });
      await waitFor(() => {
        expect(getByTestId('out').textContent).toBe('u-9:true:undefined');
      });

      act(() => {
        TAO.setAppCtx(
          new AppCtx(TERM, ACTION, ORIENT, {
            User: { clear: true },
          }),
        );
      });
      await waitFor(() => {
        expect(getByTestId('out').textContent).toBe(
          'undefined:undefined:undefined',
        );
      });
    });

    it('returns an AppCtx from the handler to forward on the network', async () => {
      const forwarded = new AppCtx(TERM, 'View', ORIENT, {
        User: { id: 'fwd' },
      });
      const viewSpy = jest.fn();
      TAO.addInlineHandler(
        { term: TERM, action: 'View', orient: ORIENT },
        viewSpy,
      );

      const { Provider: CtxProvider } = createContextHandler(
        { term: TERM, action: ACTION, orient: ORIENT },
        () => forwarded,
        {},
      );

      render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <div />
          </CtxProvider>
        </Provider>,
      );

      act(() => {
        TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT));
      });

      await waitFor(() => {
        expect(viewSpy).toHaveBeenCalled();
      });
    });

    it('uses AppCon data directly when no handler is provided', async () => {
      const { Provider: CtxProvider, Consumer } = createContextHandler(
        { term: TERM, action: ACTION, orient: ORIENT },
        null,
        {},
      );

      const { getByTestId } = render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <Consumer>
              {(value) => (
                <div data-testid="out">{value.User && value.User.id}</div>
              )}
            </Consumer>
          </CtxProvider>
        </Provider>,
      );

      act(() => {
        TAO.setAppCtx(
          new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'raw' } }),
        );
      });

      await waitFor(() => {
        expect(getByTestId('out').textContent).toBe('raw');
      });
    });

    it('unregisters handlers on unmount', () => {
      const { Provider: CtxProvider } = createContextHandler({
        term: TERM,
        action: ACTION,
        orient: ORIENT,
      });
      const addSpy = jest.spyOn(TAO, 'addInlineHandler');
      const removeSpy = jest.spyOn(TAO, 'removeInlineHandler');

      const { unmount } = render(
        <Provider TAO={TAO}>
          <CtxProvider>
            <div />
          </CtxProvider>
        </Provider>,
      );

      expect(addSpy).toHaveBeenCalled();
      const added = addSpy.mock.calls.length;
      unmount();
      expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(added);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
