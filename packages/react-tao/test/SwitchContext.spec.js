import React from 'react';
import { renderHook, cleanup } from '@testing-library/react';
import { Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import SwitchHandler from '../src/SwitchHandler';
import RenderHandler from '../src/RenderHandler';
import { useSwitchContext } from '../src/SwitchContext';

const ORIENT = 'Portal';

describe('SwitchContext', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  it('useSwitchContext returns null outside a SwitchHandler', () => {
    const { result } = renderHook(() => useSwitchContext(), {
      wrapper: ({ children }) => <Provider TAO={TAO}>{children}</Provider>,
    });

    expect(result.current).toBeNull();
  });

  it('useSwitchContext exposes defaults and signal under SwitchHandler', () => {
    const { result } = renderHook(() => useSwitchContext(), {
      wrapper: ({ children }) => (
        <Provider TAO={TAO}>
          <SwitchHandler term="User" orient={ORIENT}>
            <RenderHandler action="View">{() => null}</RenderHandler>
            {children}
          </SwitchHandler>
        </Provider>
      ),
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        defaults: expect.objectContaining({
          term: 'User',
          orient: ORIENT,
        }),
        signal: expect.objectContaining({
          tao: undefined,
          data: undefined,
        }),
      }),
    );
  });
});
