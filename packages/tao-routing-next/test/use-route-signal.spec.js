import React from 'react';
import { renderHook } from '@testing-library/react';
import { Kernel, AppCtx } from '@tao.js/core';
import { Provider } from '@tao.js/react';
import { useRouteSignal } from '../src/use-route-signal';

describe('useRouteSignal', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
    jest.spyOn(TAO, 'setAppCtx');
    jest.spyOn(TAO, 'setCtx');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wrapper =
    (kernel) =>
    ({ children }) => <Provider TAO={kernel}>{children}</Provider>;

  it('applies an explicit AppCtx signal', () => {
    const signal = new AppCtx('Page', 'Enter', 'Portal');
    renderHook(() => useRouteSignal(signal), { wrapper: wrapper(TAO) });
    expect(TAO.setAppCtx).toHaveBeenCalledWith(signal);
  });

  it('does nothing for null signal', () => {
    renderHook(() => useRouteSignal(null), { wrapper: wrapper(TAO) });
    expect(TAO.setAppCtx).not.toHaveBeenCalled();
  });

  it('re-applies when signal identity changes', () => {
    const first = new AppCtx('Page', 'Enter', 'Portal');
    const second = new AppCtx('Page', 'View', 'Portal');
    const { rerender } = renderHook(({ signal }) => useRouteSignal(signal), {
      initialProps: { signal: first },
      wrapper: wrapper(TAO),
    });
    expect(TAO.setAppCtx).toHaveBeenCalledTimes(1);

    rerender({ signal: second });
    expect(TAO.setAppCtx).toHaveBeenCalledTimes(2);
    expect(TAO.setAppCtx).toHaveBeenLastCalledWith(second);
  });
});
