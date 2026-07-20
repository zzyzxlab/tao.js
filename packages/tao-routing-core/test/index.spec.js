import * as routingCore from '../src/index';

describe('@tao.js/routing-core exports', () => {
  it('exports the public API', () => {
    expect(routingCore.applySignal).toBeInstanceOf(Function);
    expect(routingCore.getSignal).toBeInstanceOf(Function);
    expect(routingCore.createImportLoader).toBeInstanceOf(Function);
    expect(routingCore.createUseSignalEffect).toBeInstanceOf(Function);
    expect(routingCore.createUseRouteSignal).toBeInstanceOf(Function);
  });
});
