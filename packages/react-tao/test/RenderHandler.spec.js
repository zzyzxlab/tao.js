import React from 'react';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import { AppCtx, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import DataHandler from '../src/DataHandler';
import RenderHandler from '../src/RenderHandler';

const TERM = 'User';
const ACTION = 'View';
const ORIENT = 'Portal';

describe('RenderHandler', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  it('renders nothing until a matching AppCon is set', () => {
    const { container } = render(
      <Provider TAO={TAO}>
        <RenderHandler term={TERM} action={ACTION} orient={ORIENT}>
          {(tao) => <div data-testid="out">{tao.t}</div>}
        </RenderHandler>
      </Provider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders children with tao and data when a matching AppCon fires', async () => {
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <RenderHandler term={TERM} action={ACTION} orient={ORIENT}>
          {(tao, data) => (
            <div data-testid="out">
              {tao.t}:{data.User && data.User.id}
            </div>
          )}
        </RenderHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'u-9' } }));
    });

    await waitFor(() => {
      expect(getByTestId('out').textContent).toBe('User:u-9');
    });
  });

  it('passes named DataHandler context into children when context prop is set', async () => {
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <DataHandler
          name="session"
          term={TERM}
          action="Enter"
          orient={ORIENT}
          default={{ token: 'abc' }}
        >
          <RenderHandler
            term={TERM}
            action={ACTION}
            orient={ORIENT}
            context="session"
          >
            {(tao, data, session) => (
              <div data-testid="out">
                {session && session.token}:{data.User && data.User.id}
              </div>
            )}
          </RenderHandler>
        </DataHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'u-1' } }));
    });

    await waitFor(() => {
      expect(getByTestId('out').textContent).toBe('abc:u-1');
    });
  });

  it('unregisters handlers on unmount', () => {
    const addSpy = jest.spyOn(TAO, 'addInlineHandler');
    const removeSpy = jest.spyOn(TAO, 'removeInlineHandler');
    const { unmount } = render(
      <Provider TAO={TAO}>
        <RenderHandler term={TERM} action={ACTION} orient={ORIENT}>
          {() => null}
        </RenderHandler>
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
