import React from 'react';
import { renderHook } from '@testing-library/react';
import { Kernel, AppCtx } from '@tao.js/core';
import { TaoProvider } from '@tao.js/react';
import { useLoaderSignal } from '../src/use-loader-signal';

const mockUseLoaderData = jest.fn();

jest.mock('react-router', () => ({
  useLoaderData: () => mockUseLoaderData(),
}));

describe('useLoaderSignal', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
    jest.spyOn(TAO, 'setAppCtx');
    jest.spyOn(TAO, 'setCtx');
    mockUseLoaderData.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wrapper =
    (kernel) =>
    ({ children }) => <TaoProvider TAO={kernel}>{children}</TaoProvider>;

  it('applies AppCtx signal from loader data', () => {
    const signal = new AppCtx('User', 'Find', 'Portal');
    mockUseLoaderData.mockReturnValue({ signal });

    renderHook(() => useLoaderSignal(), { wrapper: wrapper(TAO) });

    expect(TAO.setAppCtx).toHaveBeenCalledWith(signal);
  });

  it('applies array signal from loader data', () => {
    const tao = { t: 'User', a: 'Find', o: 'Portal' };
    const data = { User: { id: '1' } };
    mockUseLoaderData.mockReturnValue({ signal: [tao, data] });

    renderHook(() => useLoaderSignal(), { wrapper: wrapper(TAO) });

    expect(TAO.setCtx).toHaveBeenCalledWith(tao, data);
  });

  it('does nothing when loader data has no signal', () => {
    mockUseLoaderData.mockReturnValue({});
    renderHook(() => useLoaderSignal(), { wrapper: wrapper(TAO) });
    expect(TAO.setAppCtx).not.toHaveBeenCalled();
    expect(TAO.setCtx).not.toHaveBeenCalled();
  });

  it('does nothing when loader data is null', () => {
    mockUseLoaderData.mockReturnValue(null);
    renderHook(() => useLoaderSignal(), { wrapper: wrapper(TAO) });
    expect(TAO.setAppCtx).not.toHaveBeenCalled();
  });

  it('re-applies when loader signal identity changes', () => {
    const first = new AppCtx('User', 'Find', 'Portal');
    const second = new AppCtx('User', 'View', 'Portal');
    mockUseLoaderData.mockReturnValue({ signal: first });

    const { rerender } = renderHook(() => useLoaderSignal(), {
      wrapper: wrapper(TAO),
    });
    expect(TAO.setAppCtx).toHaveBeenCalledTimes(1);

    mockUseLoaderData.mockReturnValue({ signal: second });
    rerender();
    expect(TAO.setAppCtx).toHaveBeenCalledTimes(2);
    expect(TAO.setAppCtx).toHaveBeenLastCalledWith(second);
  });
});
