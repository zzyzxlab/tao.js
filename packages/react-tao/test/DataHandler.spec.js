import React from 'react';
import {
  render,
  cleanup,
  waitFor,
  renderHook,
  act,
} from '@testing-library/react';
import { AppCtx, Kernel } from '@tao.js/core';
import TaoProvider from '../src/Provider';
import DataHandler from '../src/DataHandler';
import { useTaoData } from '../src/hooks';

const TERM = 'User';
const ACTION = 'Enter';
const ORIENT = 'Portal';

describe('DataHandler', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  it('exposes default data to descendants via useTaoData on first render', () => {
    const { result } = renderHook(() => useTaoData('user'), {
      wrapper: ({ children }) => (
        <TaoProvider TAO={TAO}>
          <DataHandler
            name="user"
            term={TERM}
            action={ACTION}
            orient={ORIENT}
            default={{ ready: true, id: null }}
          >
            {children}
          </DataHandler>
        </TaoProvider>
      ),
    });

    expect(result.current).toEqual({ ready: true, id: null });
  });

  it('updates useTaoData when a matching AppCon is set', async () => {
    function Probe() {
      const user = useTaoData('user');
      return <div data-testid="user-id">{user && user.id}</div>;
    }

    const { getByTestId } = render(
      <TaoProvider TAO={TAO}>
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
      </TaoProvider>,
    );

    expect(getByTestId('user-id').textContent).toBe('');

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'u-42' } }));
    });

    await waitFor(() => {
      expect(getByTestId('user-id').textContent).toBe('u-42');
    });
  });

  it('shadows an outer DataHandler when an inner one has the same name', () => {
    const { result } = renderHook(() => useTaoData('layer'), {
      wrapper: ({ children }) => (
        <TaoProvider TAO={TAO}>
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
        </TaoProvider>
      ),
    });

    expect(result.current).toEqual({ level: 'inner' });
  });

  it('still exposes data on first render under StrictMode', () => {
    const { result } = renderHook(() => useTaoData('user'), {
      wrapper: ({ children }) => (
        <React.StrictMode>
          <TaoProvider TAO={TAO}>
            <DataHandler
              name="user"
              term={TERM}
              action={ACTION}
              orient={ORIENT}
              default={{ strict: true }}
            >
              {children}
            </DataHandler>
          </TaoProvider>
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
          <TaoProvider TAO={TAO}>
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
          </TaoProvider>
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
      <TaoProvider TAO={TAO}>
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
      </TaoProvider>,
    );

    expect(getByTestId('left').textContent).toBe('L:ok');
    expect(getByTestId('right').textContent).toBe('R:ok');
  });

  it('resubscribes when DataHandler trigram props change', async () => {
    const addSpy = jest.spyOn(TAO, 'addInlineHandler');
    const removeSpy = jest.spyOn(TAO, 'removeInlineHandler');

    function Harness({ action }) {
      return (
        <TaoProvider TAO={TAO}>
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
        </TaoProvider>
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
