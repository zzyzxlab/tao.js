import React from 'react';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import { AppCtx, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import DataHandler from '../src/DataHandler';
import DataConsumer from '../src/DataConsumer';
import RenderHandler from '../src/RenderHandler';
import { warnDeprecated, _resetDeprecationWarnings } from '../src/deprecations';

const TERM = 'User';
const ACTION = 'View';
const ORIENT = 'Portal';

describe('deprecations', () => {
  let TAO;
  let warnSpy;

  beforeEach(() => {
    TAO = new Kernel();
    _resetDeprecationWarnings();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    warnSpy.mockRestore();
    _resetDeprecationWarnings();
  });

  it('warnDeprecated only warns once per key', () => {
    warnDeprecated('once-key', 'first');
    warnDeprecated('once-key', 'second');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('first');
  });

  it('warnDeprecated is a no-op in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    warnDeprecated('prod-key', 'should not show');
    process.env.NODE_ENV = prev;
    expect(warnSpy).not.toHaveBeenCalledWith('should not show');
  });

  it('DataConsumer emits a deprecation warning', () => {
    render(
      <Provider TAO={TAO}>
        <DataHandler
          name="session"
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          default={{}}
        >
          <DataConsumer context="session">{() => null}</DataConsumer>
        </DataHandler>
      </Provider>,
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('DataConsumer is deprecated'),
    );
  });

  it('RenderHandler context prop emits a deprecation warning', async () => {
    render(
      <Provider TAO={TAO}>
        <DataHandler
          name="session"
          term={TERM}
          action="Enter"
          orient={ORIENT}
          default={{ token: 't' }}
        >
          <RenderHandler
            term={TERM}
            action={ACTION}
            orient={ORIENT}
            context="session"
          >
            {(tao, data, session) => (
              <div data-testid="out">{session && session.token}</div>
            )}
          </RenderHandler>
        </DataHandler>
      </Provider>,
    );

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT));
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('RenderHandler `context` prop is deprecated'),
      );
    });
  });
});
