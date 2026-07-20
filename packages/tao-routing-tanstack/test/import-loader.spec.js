import { Kernel, AppCtx } from '@tao.js/core';
import { importLoader } from '../src/import-loader';

describe('importLoader', () => {
  it('delegates to createImportLoader', async () => {
    const TAO = new Kernel();
    const init = jest.fn();
    const load = new AppCtx('Home', 'Enter', 'Portal');
    const loader = importLoader(TAO);
    const result = await loader(Promise.resolve({ default: init, load }));
    expect(init).toHaveBeenCalledWith(TAO);
    expect(result).toEqual({ signal: load });
  });

  it('forwards options', async () => {
    const TAO = new Kernel();
    const init = jest.fn();
    const loader = importLoader(TAO, { skipInit: true });
    const result = await loader(
      Promise.resolve({ default: init, load: 'sig' }),
    );
    expect(init).not.toHaveBeenCalled();
    expect(result).toEqual({ signal: 'sig' });
  });
});
