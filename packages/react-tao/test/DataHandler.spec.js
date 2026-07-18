import React from 'react';
import { render, cleanup, waitForElement } from 'react-testing-library';
import { renderHook, act } from '@testing-library/react-hooks';
import { AppCtx, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import DataHandler from '../src/DataHandler';
import { useTaoDataContext } from '../src/hooks';

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

    await waitForElement(() => getByTestId('user-id').textContent === 'u-42');
    expect(getByTestId('user-id').textContent).toBe('u-42');
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
});
