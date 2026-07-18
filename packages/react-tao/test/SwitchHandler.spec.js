import React from 'react';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import { AppCtx, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import SwitchHandler from '../src/SwitchHandler';
import RenderHandler from '../src/RenderHandler';

const ORIENT = 'Portal';

describe('SwitchHandler', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  it('renders no RenderHandler children until a matching AppCon fires', () => {
    const { queryByTestId } = render(
      <Provider TAO={TAO}>
        <SwitchHandler orient={ORIENT}>
          <RenderHandler term="User" action="View">
            {() => <div data-testid="view">view</div>}
          </RenderHandler>
          <RenderHandler term="User" action="Edit">
            {() => <div data-testid="edit">edit</div>}
          </RenderHandler>
        </SwitchHandler>
      </Provider>,
    );

    expect(queryByTestId('view')).toBeNull();
    expect(queryByTestId('edit')).toBeNull();
  });

  it('shows the RenderHandler that matches the triggered AppCon', async () => {
    const { getByTestId, queryByTestId } = render(
      <Provider TAO={TAO}>
        <SwitchHandler orient={ORIENT}>
          <RenderHandler term="User" action="View">
            {() => <div data-testid="view">view</div>}
          </RenderHandler>
          <RenderHandler term="User" action="Edit">
            {() => <div data-testid="edit">edit</div>}
          </RenderHandler>
        </SwitchHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx('User', 'Edit', ORIENT));
    });

    await waitFor(() => {
      expect(getByTestId('edit').textContent).toBe('edit');
    });
    expect(queryByTestId('view')).toBeNull();
  });

  it('can switch to another RenderHandler when a different AppCon fires', async () => {
    const { getByTestId, queryByTestId } = render(
      <Provider TAO={TAO}>
        <SwitchHandler orient={ORIENT}>
          <RenderHandler term="User" action="View">
            {() => <div data-testid="view">view</div>}
          </RenderHandler>
          <RenderHandler term="User" action="Edit">
            {() => <div data-testid="edit">edit</div>}
          </RenderHandler>
        </SwitchHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx('User', 'View', ORIENT));
    });
    await waitFor(() => {
      expect(getByTestId('view')).toBeDefined();
    });

    act(() => {
      TAO.setAppCtx(new AppCtx('User', 'Edit', ORIENT));
    });
    await waitFor(() => {
      expect(getByTestId('edit')).toBeDefined();
    });
    expect(queryByTestId('view')).toBeNull();
  });

  it('passes through non-RenderHandler children', () => {
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <SwitchHandler orient={ORIENT}>
          <div data-testid="static">always</div>
          <RenderHandler term="User" action="View">
            {() => <div data-testid="view">view</div>}
          </RenderHandler>
        </SwitchHandler>
      </Provider>,
    );

    expect(getByTestId('static').textContent).toBe('always');
  });

  it('accumulates multiple chosen children when several handlers fire for one AppCon', async () => {
    // Two children that both listen to the same concrete trigram via parent defaults.
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <SwitchHandler term="User" action="View" orient={ORIENT}>
          <RenderHandler>{() => <div data-testid="a">a</div>}</RenderHandler>
          <RenderHandler>{() => <div data-testid="b">b</div>}</RenderHandler>
        </SwitchHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx('User', 'View', ORIENT));
    });

    await waitFor(() => {
      expect(getByTestId('a')).toBeDefined();
      expect(getByTestId('b')).toBeDefined();
    });
  });

  it('unregisters handlers on unmount', () => {
    const addSpy = jest.spyOn(TAO, 'addInlineHandler');
    const removeSpy = jest.spyOn(TAO, 'removeInlineHandler');
    const { unmount } = render(
      <Provider TAO={TAO}>
        <SwitchHandler orient={ORIENT}>
          <RenderHandler term="User" action="View">
            {() => null}
          </RenderHandler>
        </SwitchHandler>
      </Provider>,
    );

    expect(addSpy).toHaveBeenCalled();
    const added = addSpy.mock.calls.length;
    unmount();
    expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(added);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('logs debug details when debug is enabled', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <SwitchHandler orient={ORIENT} debug>
          <div data-testid="static">x</div>
          <RenderHandler term="User" action="View">
            {() => <div data-testid="view">view</div>}
          </RenderHandler>
        </SwitchHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx('User', 'View', ORIENT));
    });

    await waitFor(() => {
      expect(getByTestId('view')).toBeDefined();
    });
    expect(getByTestId('static')).toBeDefined();
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
