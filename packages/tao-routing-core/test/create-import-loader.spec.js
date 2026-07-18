import { AppCtx, Kernel } from '@tao.js/core';
import { createImportLoader } from '../src/create-import-loader';

describe('createImportLoader', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  it('initializes feature module and returns load as signal by default', async () => {
    const init = jest.fn();
    const load = new AppCtx('Home', 'Enter', 'Portal');
    const loader = createImportLoader(TAO);
    const result = await loader(Promise.resolve({ default: init, load }));

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(TAO);
    expect(result).toEqual({ signal: load });
  });

  it('invokes cleanup returned from initialize', async () => {
    const cleanup = jest.fn();
    const init = jest.fn(() => cleanup);
    const loader = createImportLoader(TAO);
    await loader(Promise.resolve({ default: init, load: null }));

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('does not invoke non-function initialize return', async () => {
    const init = jest.fn(() => ({ not: 'a function' }));
    const loader = createImportLoader(TAO);
    await loader(Promise.resolve({ default: init, load: 'x' }));
    expect(init).toHaveBeenCalled();
  });

  it('skips init when skipInit is true', async () => {
    const init = jest.fn();
    const load = { tao: { t: 'A', a: 'B', o: 'C' } };
    const loader = createImportLoader(TAO, { skipInit: true });
    const result = await loader(Promise.resolve({ default: init, load }));

    expect(init).not.toHaveBeenCalled();
    expect(result).toEqual({ signal: load });
  });

  it('returns null when skipLoad is true after init', async () => {
    const init = jest.fn();
    const loader = createImportLoader(TAO, { skipLoad: true });
    const result = await loader(
      Promise.resolve({ default: init, load: 'unused' }),
    );

    expect(init).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('uses custom loadSignal with extra args', async () => {
    const init = jest.fn();
    const fetchProducts = jest.fn((params) => [
      { t: 'Product', a: 'List', o: 'Portal' },
      params,
    ]);
    const load = { fetchProducts };
    const loader = createImportLoader(TAO, {
      skipInit: true,
      loadSignal: ({ fetchProducts: fp }, params) => fp(params),
    });
    const params = { id: '9' };
    const result = await loader(
      Promise.resolve({ default: init, load }),
      params,
    );

    expect(fetchProducts).toHaveBeenCalledWith(params);
    expect(result).toEqual({
      signal: [{ t: 'Product', a: 'List', o: 'Portal' }, params],
    });
  });

  it('throws when initialize is missing and skipInit is false', async () => {
    const loader = createImportLoader(TAO);
    await expect(loader(Promise.resolve({ load: 'x' }))).rejects.toThrow(
      TypeError,
    );
    await expect(
      loader(Promise.resolve({ default: null, load: 'x' })),
    ).rejects.toThrow(
      'Feature module default export must be a function (initialize)',
    );
  });

  it('allows missing initialize when skipInit is true', async () => {
    const loader = createImportLoader(TAO, { skipInit: true });
    const result = await loader(Promise.resolve({ load: 'sig' }));
    expect(result).toEqual({ signal: 'sig' });
  });
});
