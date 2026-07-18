import React from 'react';
import {
  render,
  cleanup,
  waitFor,
  renderHook,
  act,
} from '@testing-library/react';
import { AppCtx, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import DataHandler from '../src/DataHandler';
import { useTaoData, useTaoDataContext } from '../src/hooks';

const TERM = 'User';
const ACTION = 'Enter';
const ORIENT = 'Portal';

describe('DataHandler', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  it('merges handler state into the named data bag for descendants on first render', () => {
    const { result } = renderHook(() => useTaoDataContext('user'), {
      wrapper: ({ children }) => (
        <Provider TAO={TAO}>
          <DataHandler
            name="user"
            term={TERM}
            action={ACTION}
            orient={ORIENT}
            default={{ ready: true, id: null }}
          >
            {children}
          </DataHandler>
        </Provider>
      ),
    });

    expect(result.current).toEqual({ ready: true, id: null });
  });

  it('updates useTaoDataContext when a matching AppCon is set', async () => {
    function Probe() {
      const user = useTaoDataContext('user');
      return <div data-testid="user-id">{user && user.id}</div>;
    }

    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <DataHandler
          name="user"
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          default={{ id: null }}
          handler={(tao, data) => data.User}
        >
          <Probe />
        </DataHandler>
      </Provider>,
    );

    expect(getByTestId('user-id').textContent).toBe('');

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'u-42' } }));
    });

    await waitFor(() => {
      expect(getByTestId('user-id').textContent).toBe('u-42');
    });
  });

  it('nests named data so inner handlers override outer keys of the same name', () => {
    const { result } = renderHook(() => useTaoDataContext('layer'), {
      wrapper: ({ children }) => (
        <Provider TAO={TAO}>
          <DataHandler
            name="layer"
            term={TERM}
            action={ACTION}
            orient={ORIENT}
            default={{ level: 'outer' }}
          >
            <DataHandler
              name="layer"
              term={TERM}
              action="View"
              orient={ORIENT}
              default={{ level: 'inner' }}
            >
              {children}
            </DataHandler>
          </DataHandler>
        </Provider>
      ),
    });

    expect(result.current).toEqual({ level: 'inner' });
  });

  it('still exposes data on first render under StrictMode', () => {
    const { result } = renderHook(() => useTaoDataContext('user'), {
      wrapper: ({ children }) => (
        <React.StrictMode>
          <Provider TAO={TAO}>
            <DataHandler
              name="user"
              term={TERM}
              action={ACTION}
              orient={ORIENT}
              default={{ strict: true }}
            >
              {children}
            </DataHandler>
          </Provider>
        </React.StrictMode>
      ),
    });

    expect(result.current).toEqual({ strict: true });
  });

  it('useTaoData reads tree-scoped names and nearest value', () => {
    const { result } = renderHook(
      () => ({
        user: useTaoData('user'),
        prefs: useTaoData('prefs'),
        nearest: useTaoData(),
      }),
      {
        wrapper: ({ children }) => (
          <Provider TAO={TAO}>
            <DataHandler
              name="user"
              term={TERM}
              action={ACTION}
              orient={ORIENT}
              default={{ id: 'u1' }}
            >
              <DataHandler
                name="prefs"
                term={TERM}
                action="Pref"
                orient={ORIENT}
                default={{ theme: 'dark' }}
              >
                {children}
              </DataHandler>
            </DataHandler>
          </Provider>
        ),
      },
    );

    expect(result.current.user).toEqual({ id: 'u1' });
    expect(result.current.prefs).toEqual({ theme: 'dark' });
    expect(result.current.nearest).toEqual({ theme: 'dark' });
  });

  it('isolates sibling DataHandler subtrees by name', () => {
    function Left() {
      const user = useTaoData('user');
      const other = useTaoData('other');
      return (
        <div data-testid="left">
          {user ? user.id : 'none'}:{other ? 'leak' : 'ok'}
        </div>
      );
    }
    function Right() {
      const other = useTaoData('other');
      const user = useTaoData('user');
      return (
        <div data-testid="right">
          {other ? other.x : 'none'}:{user ? 'leak' : 'ok'}
        </div>
      );
    }

    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <DataHandler
          name="user"
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          default={{ id: 'L' }}
        >
          <Left />
        </DataHandler>
        <DataHandler
          name="other"
          term={TERM}
          action="View"
          orient={ORIENT}
          default={{ x: 'R' }}
        >
          <Right />
        </DataHandler>
      </Provider>,
    );

    expect(getByTestId('left').textContent).toBe('L:ok');
    expect(getByTestId('right').textContent).toBe('R:ok');
  });

  it('resubscribes when DataHandler trigram props change', async () => {
    const addSpy = jest.spyOn(TAO, 'addInlineHandler');
    const removeSpy = jest.spyOn(TAO, 'removeInlineHandler');

    function Harness({ action }) {
      return (
        <Provider TAO={TAO}>
          <DataHandler
            name="user"
            term={TERM}
            action={action}
            orient={ORIENT}
            default={{ id: null }}
            handler={(tao, data) => data.User}
          >
            <Probe />
          </DataHandler>
        </Provider>
      );
    }

    function Probe() {
      const user = useTaoData('user');
      return <div data-testid="id">{user && user.id}</div>;
    }

    const { getByTestId, rerender } = render(<Harness action={ACTION} />);
    const added = addSpy.mock.calls.length;
    expect(added).toBeGreaterThan(0);

    rerender(<Harness action="Edit" />);
    expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(added);

    act(() => {
      TAO.setAppCtx(
        new AppCtx(TERM, 'Edit', ORIENT, { User: { id: 'edited' } }),
      );
    });
    await waitFor(() => {
      expect(getByTestId('id').textContent).toBe('edited');
    });

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
