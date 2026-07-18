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
});
