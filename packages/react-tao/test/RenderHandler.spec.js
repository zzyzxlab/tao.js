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

  it('warns when a named context is missing and passes null', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <RenderHandler
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          context="missing"
        >
          {(tao, data, missing) => (
            <div data-testid="out">{missing === null ? 'null' : 'present'}</div>
          )}
        </RenderHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT));
    });

    await waitFor(() => {
      expect(getByTestId('out').textContent).toBe('null');
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unable to find context for 'missing'"),
    );
    expect(infoSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('passes multiple named contexts when context is an array', async () => {
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <DataHandler
          name="session"
          term={TERM}
          action="Enter"
          orient={ORIENT}
          default={{ token: 't' }}
        >
          <DataHandler
            name="prefs"
            term={TERM}
            action="Pref"
            orient={ORIENT}
            default={{ theme: 'light' }}
          >
            <RenderHandler
              term={TERM}
              action={ACTION}
              orient={ORIENT}
              context={['session', 'prefs']}
            >
              {(tao, data, session, prefs) => (
                <div data-testid="out">
                  {session.token}:{prefs.theme}
                </div>
              )}
            </RenderHandler>
          </DataHandler>
        </DataHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT));
    });

    await waitFor(() => {
      expect(getByTestId('out').textContent).toBe('t:light');
    });
  });

  it('re-renders on refreshOn trigrams and cleans them up on unmount', async () => {
    const addSpy = jest.spyOn(TAO, 'addInlineHandler');
    const removeSpy = jest.spyOn(TAO, 'removeInlineHandler');

    const { getByTestId, unmount } = render(
      <Provider TAO={TAO}>
        <RenderHandler
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          refreshOn={{ action: 'Refresh' }}
        >
          {(tao) => <div data-testid="out">{tao.a}</div>}
        </RenderHandler>
      </Provider>,
    );

    const addedBefore = addSpy.mock.calls.length;
    expect(addedBefore).toBeGreaterThanOrEqual(2);

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT));
    });
    await waitFor(() => {
      expect(getByTestId('out').textContent).toBe(ACTION);
    });

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, 'Refresh', ORIENT));
    });
    await waitFor(() => {
      expect(getByTestId('out').textContent).toBe('Refresh');
    });

    unmount();
    expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(addedBefore);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('ignores refreshOn when it normalizes to an empty trigram', () => {
    const addSpy = jest.spyOn(TAO, 'addInlineHandler');

    render(
      <Provider TAO={TAO}>
        <RenderHandler
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          refreshOn={{}}
        >
          {() => null}
        </RenderHandler>
      </Provider>,
    );

    // Only the base trigram handler — no extra refresh handlers
    expect(addSpy).toHaveBeenCalledTimes(1);
    addSpy.mockRestore();
  });

  it('logs debug details when debug is enabled', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <Provider TAO={TAO}>
        <RenderHandler term={TERM} action={ACTION} orient={ORIENT} debug>
          {() => null}
        </RenderHandler>
      </Provider>,
    );

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
