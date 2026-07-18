import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import DataHandler from '../src/DataHandler';
import DataConsumer from '../src/DataConsumer';

const TERM = 'User';
const ACTION = 'Enter';
const ORIENT = 'Portal';

describe('DataConsumer', () => {
  let TAO;
  let warnSpy;
  let infoSpy;

  beforeEach(() => {
    TAO = new Kernel();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('passes a single named context value to children', () => {
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <DataHandler
          name="session"
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          default={{ token: 'tok-1' }}
        >
          <DataConsumer context="session">
            {(session) => (
              <div data-testid="out">{session && session.token}</div>
            )}
          </DataConsumer>
        </DataHandler>
      </Provider>,
    );

    expect(getByTestId('out').textContent).toBe('tok-1');
  });

  it('passes multiple named contexts when context is an array', () => {
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <DataHandler
          name="session"
          term={TERM}
          action={ACTION}
          orient={ORIENT}
          default={{ token: 'a' }}
        >
          <DataHandler
            name="prefs"
            term={TERM}
            action="View"
            orient={ORIENT}
            default={{ theme: 'dark' }}
          >
            <DataConsumer context={['session', 'prefs']}>
              {(session, prefs) => (
                <div data-testid="out">
                  {session.token}:{prefs.theme}
                </div>
              )}
            </DataConsumer>
          </DataHandler>
        </DataHandler>
      </Provider>,
    );

    expect(getByTestId('out').textContent).toBe('a:dark');
  });

  it('warns and passes null when a named context is missing', () => {
    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <DataConsumer context="missing">
          {(value) => (
            <div data-testid="out">{value === null ? 'null' : 'present'}</div>
          )}
        </DataConsumer>
      </Provider>,
    );

    expect(getByTestId('out').textContent).toBe('null');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unable to find context for 'missing'"),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('setting context missing data arg to null'),
    );
  });
});
