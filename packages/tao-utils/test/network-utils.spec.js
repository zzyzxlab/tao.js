import { AppCtx, Kernel, Network } from '@tao.js/core';
import Channel from '../src/Channel';
import Source from '../src/Source';
import Relay from '../src/Relay';
import Transponder from '../src/Transponder';
import Transceiver from '../src/Transceiver';

const SOURCE = { t: 'Source', a: 'Load', o: 'Page' };
const TARGET = { t: 'Target', a: 'Show', o: 'Page' };
const DATA = {
  Source: { id: 1 },
  Load: { pending: false },
  Page: { current: true },
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Channel', () => {
  it('delegates public signal methods to its wrapped network', () => {
    const network = {
      setCtxControl: jest.fn(),
      setAppCtxControl: jest.fn(),
    };
    const channel = new Channel({ _network: network }, 'delegating');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const forward = jest.fn();

    channel.setCtx(SOURCE, DATA);
    channel.setCtxControl(SOURCE, DATA, { existing: true }, forward);
    channel.setAppCtx(appCtx);
    channel.setAppCtxControl(appCtx, { existing: true }, forward);

    expect(network.setCtxControl).toHaveBeenCalledTimes(2);
    expect(network.setAppCtxControl).toHaveBeenCalledTimes(2);
    expect(network.setCtxControl).toHaveBeenCalledWith(
      expect.objectContaining(SOURCE),
      DATA,
      { channelId: 'delegating' },
      expect.any(Function),
    );
    expect(network.setAppCtxControl).toHaveBeenCalledWith(
      appCtx,
      { channelId: 'delegating' },
      expect.any(Function),
    );

    const ctxForward = network.setCtxControl.mock.calls[1][3];
    ctxForward(appCtx, { channelId: 'delegating' });
    expect(forward).toHaveBeenCalledWith(appCtx, {
      channelId: 'delegating',
    });

    const appCtxForward = network.setAppCtxControl.mock.calls[1][2];
    appCtxForward(appCtx, { channelId: 'delegating' });
    expect(forward).toHaveBeenCalledTimes(2);
  });

  it('scopes its handlers to signals it originates and supports lifecycle methods', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'channel-id');
    const received = jest.fn();
    const intercept = jest.fn();
    const async = jest.fn();
    const inline = jest.fn();

    expect(channel.addInterceptHandler(SOURCE, intercept)).toBe(channel);
    expect(channel.addAsyncHandler(SOURCE, async)).toBe(channel);
    expect(channel.addInlineHandler(SOURCE, inline)).toBe(channel);
    channel.addInlineHandler(SOURCE, received);
    channel.forwardAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA), {
      channelId: 'channel-id',
    });
    await tick();

    expect(intercept).toHaveBeenCalledWith(SOURCE, DATA);
    expect(async).toHaveBeenCalledWith(SOURCE, DATA);
    expect(inline).toHaveBeenCalledWith(SOURCE, DATA);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);

    expect(channel.removeInterceptHandler(SOURCE, intercept)).toBe(channel);
    expect(channel.removeAsyncHandler(SOURCE, async)).toBe(channel);
    expect(channel.removeInlineHandler(SOURCE, inline)).toBe(channel);
    channel.forwardAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA), {
      channelId: 'channel-id',
    });
    await tick();
    expect(intercept).toHaveBeenCalledTimes(1);
    expect(async).toHaveBeenCalledTimes(1);
    expect(inline).toHaveBeenCalledTimes(1);
  });

  it('clones channel configuration and accepts controlled signals', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, (id) => `channel-${id}`);
    const received = jest.fn();
    channel.addInlineHandler(SOURCE, received);
    const clone = channel.clone();

    clone.forwardAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA), {
      channelId: clone._channelId,
      extra: true,
    });
    await tick();
    expect(clone).toBeInstanceOf(Channel);
    expect(clone._channelId).not.toBe(channel._channelId);

    const forward = jest.fn();
    channel.setAppCtxControl(
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      {},
      forward,
    );
    await tick();
    expect(forward).not.toHaveBeenCalled();
  });

  it('supports channel middleware and bridgeFrom cleanup', () => {
    const kernel = new Kernel();
    const other = new Kernel();
    const channel = new Channel(kernel, 'channel');
    const middleware = jest.fn();

    channel.use(middleware);
    channel.stop(middleware);
    expect(channel.bridgeFrom(other, SOURCE)).toBeInstanceOf(Function);
  });

  it('actually registers and unregisters middleware on the underlying channel network', () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'live-middleware');
    const middleware = jest.fn();

    channel.use(middleware);
    channel.forwardAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA), {
      channelId: 'live-middleware',
    });
    expect(middleware).toHaveBeenCalledTimes(1);

    channel.stop(middleware);
    channel.forwardAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA), {
      channelId: 'live-middleware',
    });
    expect(middleware).toHaveBeenCalledTimes(1);
  });

  it('logs debug forwarding and only handles its own signals', () => {
    const network = { setAppCtxControl: jest.fn() };
    const channel = new Channel({ _network: network }, 'debug', true);
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    channel.forwardAppCtx(appCtx, { channelId: 'debug' });
    channel.forwardAppCtx(appCtx, { channelId: 'other' });
    network.setAppCtxControl.mock.calls[0][2](appCtx, { channelId: 'other' });

    expect(channel._channel.setAppCtxControl).toBeDefined();
    expect(network.setAppCtxControl).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('generates IDs and accepts Network instances directly', () => {
    const channel = new Channel(new Network());

    expect(channel._channelId).toEqual(expect.any(Number));
    expect(channel._network).toBeInstanceOf(Network);
  });

  it('does not log by default when debug is left unset', () => {
    const network = { setAppCtxControl: jest.fn() };
    const channel = new Channel({ _network: network }, 'quiet');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    channel.forwardAppCtx(appCtx, { channelId: 'quiet' });

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('only forwards into its own channel when the control channelId matches', () => {
    const network = { setAppCtxControl: jest.fn() };
    const channel = new Channel({ _network: network }, 'match-only');
    const innerSpy = jest.spyOn(channel._channel, 'setAppCtxControl');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    channel.forwardAppCtx(appCtx, { channelId: 'someone-else' });
    expect(innerSpy).not.toHaveBeenCalled();

    channel.forwardAppCtx(appCtx, { channelId: 'match-only' });
    expect(innerSpy).toHaveBeenCalledTimes(1);
  });

  it('routes the internal channel setAppCtxControl callback through setAppCtx', () => {
    const network = { setAppCtxControl: jest.fn() };
    const channel = new Channel({ _network: network }, 'inner-callback');
    const innerSpy = jest.spyOn(channel._channel, 'setAppCtxControl');
    const setAppCtx = jest
      .spyOn(channel, 'setAppCtx')
      .mockImplementation(() => {});
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    channel.forwardAppCtx(appCtx, { channelId: 'inner-callback' });
    const innerCallback = innerSpy.mock.calls[0][2];
    innerCallback(appCtx);
    expect(setAppCtx).toHaveBeenCalledWith(appCtx);
    setAppCtx.mockRestore();
  });

  it('wires setCtx and setAppCtx forwarding callbacks to forwardAppCtx', () => {
    const network = {
      setCtxControl: jest.fn(),
      setAppCtxControl: jest.fn(),
    };
    const channel = new Channel({ _network: network }, 'wiring');
    const forwardSpy = jest.spyOn(channel, 'forwardAppCtx');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    channel.setCtx(SOURCE, DATA);
    const ctxForward = network.setCtxControl.mock.calls[0][3];
    ctxForward(appCtx, { channelId: 'wiring' });
    expect(forwardSpy).toHaveBeenCalledTimes(1);
    expect(forwardSpy).toHaveBeenNthCalledWith(1, appCtx, {
      channelId: 'wiring',
    });

    forwardSpy.mockClear();
    network.setAppCtxControl.mockClear();
    channel.setAppCtx(appCtx);
    // setAppCtx's own call to network.setAppCtxControl - not to be confused
    // with the recursive call forwardAppCtx makes to itself above
    expect(network.setAppCtxControl).toHaveBeenCalledTimes(1);
    const appCtxForward = network.setAppCtxControl.mock.calls[0][2];
    appCtxForward(appCtx, { channelId: 'wiring' });
    expect(forwardSpy).toHaveBeenCalledTimes(1);
    expect(forwardSpy).toHaveBeenNthCalledWith(1, appCtx, {
      channelId: 'wiring',
    });
    forwardSpy.mockRestore();
  });

  it('merges channel control into setCtxControl/setAppCtxControl calls and forwards optionally', () => {
    const network = {
      setCtxControl: jest.fn(),
      setAppCtxControl: jest.fn(),
    };
    const channel = new Channel({ _network: network }, 'merging');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const forward = jest.fn();

    channel.setCtxControl(SOURCE, DATA, { existing: true }, forward);
    expect(network.setCtxControl).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining(SOURCE),
      DATA,
      { existing: true, channelId: 'merging' },
      expect.any(Function),
    );
    const ctxCallback = network.setCtxControl.mock.calls[0][3];
    ctxCallback(appCtx, { channelId: 'merging' });
    expect(forward).toHaveBeenCalledWith(appCtx, { channelId: 'merging' });

    // calling without an optional forwardAppCtx must not throw and must not invoke anything extra
    channel.setCtxControl(SOURCE, DATA, { existing: true });
    const ctxCallbackNoForward = network.setCtxControl.mock.calls[1][3];
    expect(() =>
      ctxCallbackNoForward(appCtx, { channelId: 'merging' }),
    ).not.toThrow();

    // invoking the ctx callbacks above also drives forwardAppCtx, which calls
    // network.setAppCtxControl - clear that unrelated noise before asserting below
    network.setAppCtxControl.mockClear();
    forward.mockClear();

    channel.setAppCtxControl(appCtx, { existing: true }, forward);
    expect(network.setAppCtxControl).toHaveBeenNthCalledWith(
      1,
      appCtx,
      { existing: true, channelId: 'merging' },
      expect.any(Function),
    );
    const appCtxCallback = network.setAppCtxControl.mock.calls[0][2];
    forward.mockClear();
    appCtxCallback(appCtx, { channelId: 'merging' });
    expect(forward).toHaveBeenCalledWith(appCtx, { channelId: 'merging' });

    // invoking appCtxCallback above also drives forwardAppCtx, which calls
    // network.setAppCtxControl again - clear that noise so the next call we
    // read back below is unambiguously the one from setAppCtxControl itself
    network.setAppCtxControl.mockClear();

    channel.setAppCtxControl(appCtx, { existing: true });
    const appCtxCallbackNoForward = network.setAppCtxControl.mock.calls[0][2];
    expect(() =>
      appCtxCallbackNoForward(appCtx, { channelId: 'merging' }),
    ).not.toThrow();
  });

  it('scopes add*Handler registrations to the trigram they were given', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'scoped');
    const intercept = jest.fn();
    const asyncHandler = jest.fn();
    const inline = jest.fn();

    channel.addInterceptHandler(SOURCE, intercept);
    channel.addAsyncHandler(SOURCE, asyncHandler);
    channel.addInlineHandler(SOURCE, inline);

    channel.forwardAppCtx(new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA), {
      channelId: 'scoped',
    });
    await tick();

    expect(intercept).not.toHaveBeenCalled();
    expect(asyncHandler).not.toHaveBeenCalled();
    expect(inline).not.toHaveBeenCalled();

    channel.forwardAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA), {
      channelId: 'scoped',
    });
    await tick();

    expect(intercept).toHaveBeenCalledWith(SOURCE, DATA);
    expect(asyncHandler).toHaveBeenCalledWith(SOURCE, DATA);
    expect(inline).toHaveBeenCalledWith(SOURCE, DATA);
  });

  it('clones with an explicit cloneId, a generator, and a fresh generated ID', () => {
    const kernel = new Kernel();

    const explicit = new Channel(kernel, 'explicit-parent');
    const explicitClone = explicit.clone('explicit-clone');
    expect(explicitClone._channelId).toBe('explicit-clone');

    const generated = new Channel(kernel, (id) => `generated-${id}`);
    expect(generated._cloneWithId).toBeInstanceOf(Function);
    const generatedClone = generated.clone();
    expect(generatedClone._channelId).toMatch(/^generated-/);
    expect(generatedClone._channelId).not.toBe(generated._channelId);

    const plain = new Channel(kernel, 'plain-parent');
    expect(plain._cloneWithId).toBeUndefined();
    const plainClone = plain.clone();
    expect(plainClone._channelId).toEqual(expect.any(Number));
    expect(plainClone._channelId).not.toBe('plain-parent');
  });

  it('filters bridged signals to those not already originating from this channel', () => {
    const source = new Kernel();
    const destinationKernel = new Kernel();
    const channel = new Channel(destinationKernel, 'bridge-dest');
    const received = jest.fn();
    channel.addInlineHandler(SOURCE, received);

    const stop = channel.bridgeFrom(source, SOURCE);

    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);

    received.mockClear();
    source._network.setCtxControl(SOURCE, DATA, {
      channelId: channel._channelId,
    });
    expect(received).not.toHaveBeenCalled();

    stop();
  });
});

describe('Source and Relay', () => {
  it('binds Source input, ignores its echo, and disposes middleware', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    let receiveFromSource;
    const source = new Source(kernel, toSrc, 'named', (callback) => {
      receiveFromSource = callback;
    });

    expect(source.name).toBe('named');
    receiveFromSource(SOURCE, DATA);
    expect(toSrc).not.toHaveBeenCalled();
    kernel.setCtx(SOURCE, DATA);
    expect(toSrc).toHaveBeenCalledWith(SOURCE, DATA);
    source.dispose();
    kernel.setCtx(SOURCE, DATA);
    expect(toSrc).toHaveBeenCalledTimes(1);
  });

  it('validates Source bindings and supports function shorthand names', () => {
    const kernel = new Kernel();
    expect(() => new Source({}, jest.fn())).toThrow(/kernel/);
    expect(() => new Source(kernel)).toThrow(/toSrc/);
    // an exact message match (not a loose regex) distinguishes the intentional
    // validation throw from the incidental TypeError `{}(...)` would raise anyway
    expect(() => new Source(kernel, jest.fn(), 'name', {})).toThrow(
      'optional `fromSrc` must be a function',
    );

    const receivedCallback = jest.fn();
    const shorthand = new Source(kernel, jest.fn(), receivedCallback);
    expect(shorthand).toBeInstanceOf(Source);
    expect(receivedCallback).toHaveBeenCalledWith(expect.any(Function));
    expect(shorthand.name).toMatch(/^FROM\d+$/);

    const another = new Source(kernel, jest.fn(), () => {});
    expect(another.name).toMatch(/^FROM\d+$/);
    expect(another.name).not.toBe(shorthand.name);
  });

  it('forwards captured fromSrc input into the shared network', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    const received = jest.fn();
    let receiveFromSource;
    new Source(kernel, toSrc, 'source-forward', (callback) => {
      receiveFromSource = callback;
    });
    kernel.addInlineHandler(SOURCE, received);

    receiveFromSource(SOURCE, DATA);

    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
  });

  it('relays external input without echoing and disposes itself', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    let relayInput;
    const relay = new Relay(kernel, toSrc, 'relay', (callback) => {
      relayInput = callback;
    });

    relayInput(SOURCE, DATA);
    expect(toSrc).not.toHaveBeenCalled();
    kernel.setCtx(SOURCE, DATA);
    expect(toSrc).toHaveBeenCalledWith(SOURCE, DATA);
    relay.dispose();
    kernel.setCtx(SOURCE, DATA);
    expect(toSrc).toHaveBeenCalledTimes(1);
  });

  it('validates Relay input and sends contexts through setCtx', () => {
    const kernel = new Kernel();
    expect(() => new Relay({}, jest.fn(), () => {})).toThrow(/kernel/);
    expect(() => new Relay(kernel, null, () => {})).toThrow(/toSrc/);

    const receivedCallback = jest.fn();
    expect(new Relay(kernel, jest.fn(), receivedCallback)).toBeInstanceOf(
      Relay,
    );
    expect(receivedCallback).toHaveBeenCalledWith(expect.any(Function));

    const toSrc = jest.fn();
    const received = jest.fn();
    const relay = new Relay(kernel, toSrc, 'relay', () => {});
    kernel.addInlineHandler(SOURCE, received);
    relay.setCtx(SOURCE, DATA);

    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
    expect(toSrc).not.toHaveBeenCalled();
    relay.dispose();
  });

  it('auto-generates unique names when none is provided, and uses given ones exactly', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    const named = new Relay(kernel, toSrc, 'exact-name', () => {});
    expect(named.name).toBe('exact-name');

    const auto1 = new Relay(kernel, toSrc, () => {});
    const auto2 = new Relay(kernel, toSrc, () => {});
    expect(auto1.name).toMatch(/^FROM\d+$/);
    expect(auto2.name).toMatch(/^FROM\d+$/);
    expect(auto1.name).not.toBe(auto2.name);
  });

  it('forwards captured fromSrc input into the shared network', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    const received = jest.fn();
    let relayInput;
    const relay = new Relay(kernel, toSrc, 'relay-forward', (callback) => {
      relayInput = callback;
    });
    kernel.addInlineHandler(SOURCE, received);

    relayInput(SOURCE, DATA);

    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
    relay.dispose();
  });

  it('invokes toSrc only when the control does not carry its own source name', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    const relay = new Relay(kernel, toSrc, 'direct-relay', () => {});
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    relay.handleAppCon({}, appCtx, jest.fn(), undefined);
    expect(toSrc).toHaveBeenCalledWith(appCtx.unwrapCtx(), appCtx.data);

    toSrc.mockClear();
    relay.handleAppCon({}, appCtx, jest.fn(), { source: 'direct-relay' });
    expect(toSrc).not.toHaveBeenCalled();

    relay.dispose();
  });
});

describe('Transponder', () => {
  it('resolves with the first handled AppCtx and supports clone/attachment lifecycle', async () => {
    const kernel = new Kernel();
    const transponder = new Transponder(kernel, (id) => `transponder-${id}`);
    const clone = transponder.clone();

    await expect(transponder.setCtx(SOURCE, DATA)).resolves.toBeInstanceOf(
      AppCtx,
    );
    await expect(
      clone.setAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA)),
    ).resolves.toBeInstanceOf(AppCtx);
    expect(transponder.detach()).toBe(transponder);
    expect(transponder.attach()).toBe(transponder);
  });

  it('rejects after its configured timeout while detached', async () => {
    jest.useFakeTimers();
    const transponder = new Transponder(new Kernel(), 'timeout', 10);
    transponder.detach();
    const result = transponder.setCtx(SOURCE, DATA);
    jest.advanceTimersByTime(10);
    await expect(result).rejects.toBe('reached timeout of: 10ms');
    jest.useRealTimers();
  });

  it('uses generated IDs and logs matching signals in debug mode', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const transponder = new Transponder(
      new Kernel(),
      (id) => `transponder-${id}`,
      0,
      Promise,
      true,
    );
    const signal = jest.fn();

    transponder.handleSignalAppCon(
      {},
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      { transponderId: transponder._transponderId, signal },
    );

    expect(signal).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('applies timeouts to AppCtx signals too', async () => {
    jest.useFakeTimers();
    const transponder = new Transponder(new Kernel(), 'timeout', 10);
    transponder.detach();
    const result = transponder.setAppCtx(
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
    );

    jest.advanceTimersByTime(10);
    await expect(result).rejects.toBe('reached timeout of: 10ms');
    jest.useRealTimers();
  });

  it('uses an automatic ID when none is supplied', () => {
    expect(new Transponder(new Kernel())._transponderId).toEqual(
      expect.any(Number),
    );
  });

  it('resolves ids via generator functions, explicit values, and defaults', () => {
    const generated = new Transponder(new Kernel(), (id) => `tp-${id}`);
    expect(generated._transponderId).toMatch(/^tp-\d+$/);
    expect(generated._cloneWithId).toBeInstanceOf(Function);

    const explicit = new Transponder(new Kernel(), 'explicit-id');
    expect(explicit._transponderId).toBe('explicit-id');
    expect(explicit._cloneWithId).toBeUndefined();

    const automatic = new Transponder(new Kernel());
    expect(automatic._transponderId).toEqual(expect.any(Number));
    expect(automatic._cloneWithId).toBeUndefined();
  });

  it('clones with an explicit cloneId, a generator, and a fresh generated ID', () => {
    const explicitParent = new Transponder(new Kernel(), 'explicit-parent');
    const explicitClone = explicitParent.clone('explicit-clone');
    expect(explicitClone._transponderId).toBe('explicit-clone');

    const generated = new Transponder(new Kernel(), (id) => `gen-${id}`);
    const generatedClone = generated.clone();
    expect(generatedClone._transponderId).toMatch(/^gen-/);
    expect(generatedClone._transponderId).not.toBe(generated._transponderId);

    const plain = new Transponder(new Kernel(), 'plain-parent');
    const plainClone = plain.clone();
    expect(plainClone._transponderId).toEqual(expect.any(Number));
    expect(plainClone._transponderId).not.toBe('plain-parent');
  });

  it('clamps negative timeouts to zero but keeps positive timeouts', () => {
    expect(new Transponder(new Kernel(), 'neg', -5)._timeoutMs).toBe(0);
    expect(new Transponder(new Kernel(), 'zero', 0)._timeoutMs).toBe(0);
    expect(new Transponder(new Kernel(), 'pos', 25)._timeoutMs).toBe(25);
  });

  it('only schedules a timeout when timeoutMs is truthy', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const transponder = new Transponder(new Kernel(), 'no-timeout');

    transponder.setCtx(SOURCE, DATA);
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    transponder.setAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA));
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it('does not log by default when debug is left unset', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const transponder = new Transponder(new Kernel(), 'quiet-transponder');
    const signal = jest.fn();

    transponder.handleSignalAppCon(
      {},
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      { transponderId: transponder._transponderId, signal },
    );

    expect(signal).toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('only signals once per control, ignoring mismatched or already-signalled controls', () => {
    const transponder = new Transponder(new Kernel(), 'signal-guard');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const forward = jest.fn();

    const mismatched = { transponderId: 'someone-else', signal: jest.fn() };
    transponder.handleSignalAppCon({}, appCtx, forward, mismatched);
    expect(mismatched.signal).not.toHaveBeenCalled();

    const noSignal = { transponderId: transponder._transponderId };
    expect(() =>
      transponder.handleSignalAppCon({}, appCtx, forward, noSignal),
    ).not.toThrow();

    const alreadySignalled = {
      transponderId: transponder._transponderId,
      signal: jest.fn(),
      signalled: true,
    };
    transponder.handleSignalAppCon({}, appCtx, forward, alreadySignalled);
    expect(alreadySignalled.signal).not.toHaveBeenCalled();

    const matching = {
      transponderId: transponder._transponderId,
      signal: jest.fn(),
    };
    transponder.handleSignalAppCon({}, appCtx, forward, matching);
    expect(matching.signal).toHaveBeenCalledWith(appCtx);
    expect(matching.signalled).toBe(true);
  });
});

describe('Transceiver', () => {
  it('captures direct intercept, async, and inline handler outcomes', async () => {
    const transceiver = new Transceiver(new Kernel(), 'capture');
    const next = new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA);
    const setAppCtx = jest.fn();
    const signal = { resolve: jest.fn(), reject: jest.fn() };

    await transceiver.captureSignal(
      {
        interceptHandlers: [() => next],
        asyncHandlers: [],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      setAppCtx,
      { signal },
    );
    expect(setAppCtx).toHaveBeenCalledWith(next, expect.any(Object));

    const asyncControl = { signal: { resolve: jest.fn(), reject: jest.fn() } };
    await transceiver.captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [() => 'async result'],
        inlineHandlers: [() => next, () => 'inline result'],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      setAppCtx,
      asyncControl,
    );
    await tick();
    expect(asyncControl.signal.resolve).toHaveBeenCalledWith('async result');
    expect(setAppCtx).toHaveBeenCalledWith(next, asyncControl);
  });

  it('captures rejected handlers and forwarding errors', async () => {
    const transceiver = new Transceiver(new Kernel(), (id) => `capture-${id}`);
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const setAppCtx = jest.fn(() => {
      throw new Error('forward failed');
    });

    const interceptControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await transceiver.captureSignal(
      {
        interceptHandlers: [() => null, () => appCtx],
        asyncHandlers: [],
        inlineHandlers: [],
      },
      appCtx,
      setAppCtx,
      interceptControl,
    );
    expect(interceptControl.signal.reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'forward failed' }),
    );

    const asyncControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    const setAsyncAppCtx = jest.fn();
    await transceiver.captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [() => Promise.reject(new Error('async failed'))],
        inlineHandlers: [() => appCtx],
      },
      appCtx,
      setAsyncAppCtx,
      asyncControl,
    );
    await tick();
    expect(asyncControl.signal.reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'async failed' }),
    );

    const inlineControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await transceiver.captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [],
        inlineHandlers: [() => appCtx],
      },
      appCtx,
      setAppCtx,
      inlineControl,
    );
    expect(inlineControl.signal.reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'forward failed' }),
    );
  });

  it('rejects signals when capture fails asynchronously', async () => {
    const transceiver = new Transceiver(new Kernel(), 'capture-error');
    const reject = jest.fn();
    transceiver.captureSignal = jest.fn(() =>
      Promise.reject(new Error('capture failed')),
    );
    const control = {
      transceiverId: transceiver._transceiverId,
      signal: { reject },
    };

    transceiver.handleSignalAppCon(
      {},
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      control,
    );
    await tick();

    expect(reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'capture failed' }),
    );
    expect(control.signalled).toBe(true);
  });

  it('does not re-reject an async capture failure once the control was already signalled', async () => {
    const transceiver = new Transceiver(
      new Kernel(),
      'capture-error-signalled',
    );
    const reject = jest.fn();
    transceiver.captureSignal = jest.fn((_handler, _ac, _fwd, control) => {
      control.signalled = true;
      return Promise.reject(new Error('capture failed'));
    });

    transceiver.handleSignalAppCon(
      {},
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      {
        transceiverId: transceiver._transceiverId,
        signal: { reject },
      },
    );
    await tick();

    expect(reject).not.toHaveBeenCalled();
  });

  it('resolves values returned by signal handlers and can remove handlers', async () => {
    const kernel = new Kernel();
    const transceiver = new Transceiver(kernel, 'transceiver');
    const signalHandler = jest.fn(() => 'complete');
    const sourceHandler = () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA);

    transceiver.addSignalHandler(TARGET, signalHandler);
    kernel.addInlineHandler(SOURCE, sourceHandler);
    await expect(transceiver.setCtx(SOURCE, DATA)).resolves.toBe('complete');
    expect(signalHandler).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });

    transceiver.removeInlineHandler(TARGET, signalHandler);
    transceiver.addInlineHandler(TARGET, signalHandler);
    transceiver.addAsyncHandler(TARGET, signalHandler);
    transceiver.removeAsyncHandler(TARGET, signalHandler);
    transceiver.removeInterceptHandler(TARGET, signalHandler);
  });

  it('chains AppCtx values returned by async handlers', async () => {
    const transceiver = new Transceiver(new Kernel(), 'async-appctx');
    const next = new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA);
    const setAppCtx = jest.fn();

    await transceiver.captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [() => next],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      setAppCtx,
      { signal: { resolve: jest.fn(), reject: jest.fn() } },
    );
    await tick();

    expect(setAppCtx).toHaveBeenCalledWith(next, expect.any(Object));
  });

  it('rejects truthy intercept results and supports AppCtx chaining', async () => {
    const kernel = new Kernel();
    const transceiver = new Transceiver(kernel, 'transceiver');
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    transceiver.addInterceptHandler(TARGET, () => 'stopped');

    await expect(
      transceiver.setAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA)),
    ).rejects.toBe('stopped');
  });

  it('rejects unresolved signals when configured with a timeout', async () => {
    jest.useFakeTimers();
    const transceiver = new Transceiver(new Kernel(), 'timeout', 10);
    const contextPromise = transceiver.setCtx(SOURCE, DATA);
    const appCtxPromise = transceiver.setAppCtx(
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
    );

    jest.advanceTimersByTime(10);
    await expect(contextPromise).rejects.toBe('reached timeout of: 10ms');
    await expect(appCtxPromise).rejects.toBe('reached timeout of: 10ms');
    jest.useRealTimers();
  });

  it('generates IDs and accepts Network instances directly', () => {
    const transceiver = new Transceiver(new Network());

    expect(transceiver._transceiverId).toEqual(expect.any(Number));
    expect(transceiver._network).toBeInstanceOf(Network);
  });

  it('resolves ids via generator functions, explicit values, and defaults', () => {
    const generated = new Transceiver(new Kernel(), (id) => `t-${id}`);
    expect(generated._transceiverId).toMatch(/^t-\d+$/);
    expect(generated._cloneWithId).toBeInstanceOf(Function);

    const explicit = new Transceiver(new Kernel(), 'explicit-id');
    expect(explicit._transceiverId).toBe('explicit-id');
    expect(explicit._cloneWithId).toBeUndefined();

    const automatic = new Transceiver(new Kernel());
    expect(automatic._transceiverId).toEqual(expect.any(Number));
    expect(automatic._cloneWithId).toBeUndefined();
  });

  it('only schedules a timeout when timeoutMs is truthy', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const transceiver = new Transceiver(new Kernel(), 'no-timeout');

    transceiver.setCtx(SOURCE, DATA);
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    transceiver.setAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA));
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it('only relays into its own signal network when the transceiverId matches', () => {
    const network = { setAppCtxControl: jest.fn() };
    const transceiver = new Transceiver(
      { _network: network },
      'scoped-forward',
    );
    const innerSpy = jest.spyOn(transceiver._signals, 'setAppCtxControl');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    transceiver.forwardAppCtx(appCtx, { transceiverId: 'someone-else' });
    expect(innerSpy).not.toHaveBeenCalled();

    transceiver.forwardAppCtx(appCtx, { transceiverId: 'scoped-forward' });
    expect(innerSpy).toHaveBeenCalledTimes(1);
    expect(network.setAppCtxControl).toHaveBeenCalledTimes(2);
  });

  it('only invokes captureSignal when control matches and has not already signalled', () => {
    const transceiver = new Transceiver(new Kernel(), 'guarded');
    const captureSpy = jest
      .spyOn(transceiver, 'captureSignal')
      .mockResolvedValue();
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const forward = jest.fn();

    transceiver.handleSignalAppCon({}, appCtx, forward, {
      transceiverId: 'someone-else',
      signal: {},
    });
    expect(captureSpy).not.toHaveBeenCalled();

    transceiver.handleSignalAppCon({}, appCtx, forward, {
      transceiverId: 'guarded',
      signal: null,
    });
    expect(captureSpy).not.toHaveBeenCalled();

    transceiver.handleSignalAppCon({}, appCtx, forward, {
      transceiverId: 'guarded',
      signal: {},
      signalled: true,
    });
    expect(captureSpy).not.toHaveBeenCalled();

    transceiver.handleSignalAppCon({}, appCtx, forward, {
      transceiverId: 'guarded',
      signal: {},
    });
    expect(captureSpy).toHaveBeenCalledTimes(1);
    captureSpy.mockRestore();
  });

  it('rejects synchronously if captureSignal cannot be invoked', () => {
    const transceiver = new Transceiver(new Kernel(), 'sync-throw');
    transceiver.captureSignal = undefined;
    const reject = jest.fn();
    const control = {
      transceiverId: transceiver._transceiverId,
      signal: { reject },
    };

    transceiver.handleSignalAppCon(
      {},
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      control,
    );

    expect(reject).toHaveBeenCalledWith(expect.any(TypeError));
    expect(control.signalled).toBe(true);
  });

  it('passes the exact trigram to intercept and async handlers, not a stray object', async () => {
    const transceiver = new Transceiver(new Kernel(), 'trigram-shape');
    const seenIntercept = [];
    const seenAsync = [];

    await transceiver.captureSignal(
      {
        interceptHandlers: [
          (tao) => {
            seenIntercept.push(tao);
            return null;
          },
        ],
        asyncHandlers: [
          (tao) => {
            seenAsync.push(tao);
            return undefined;
          },
        ],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      { signal: { resolve: jest.fn(), reject: jest.fn() } },
    );

    expect(seenIntercept).toEqual([{ t: SOURCE.t, a: SOURCE.a, o: SOURCE.o }]);
    expect(seenAsync).toEqual([{ t: SOURCE.t, a: SOURCE.a, o: SOURCE.o }]);
  });

  it('does not resolve or forward when an async handler returns nullish', async () => {
    const transceiver = new Transceiver(new Kernel(), 'async-null');
    const setAppCtx = jest.fn();
    const resolve = jest.fn();

    await transceiver.captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [() => null],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      setAppCtx,
      { signal: { resolve, reject: jest.fn() } },
    );
    await tick();

    expect(setAppCtx).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('ignores nullish inline handler results without resolving or spooling', async () => {
    const transceiver = new Transceiver(new Kernel(), 'inline-null');
    const setAppCtx = jest.fn();
    const resolve = jest.fn();

    await transceiver.captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [],
        inlineHandlers: [() => null, () => undefined],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      setAppCtx,
      { signal: { resolve, reject: jest.fn() } },
    );

    expect(setAppCtx).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('resolves using only the first non-AppCtx inline result', async () => {
    const transceiver = new Transceiver(new Kernel(), 'inline-first');
    const resolve = jest.fn();

    await transceiver.captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [],
        inlineHandlers: [() => 'first', () => 'second'],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      { signal: { resolve, reject: jest.fn() } },
    );

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('first');
  });

  it('marks the control as signalled the first time each branch resolves or rejects', async () => {
    const next = new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA);
    const throwingSetAppCtx = jest.fn(() => {
      throw new Error('boom');
    });

    const interceptRejectControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await new Transceiver(new Kernel(), 'signalled-1').captureSignal(
      {
        interceptHandlers: [() => 'blocked'],
        asyncHandlers: [],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      interceptRejectControl,
    );
    expect(interceptRejectControl.signalled).toBe(true);

    const interceptThrowControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await new Transceiver(new Kernel(), 'signalled-2').captureSignal(
      {
        interceptHandlers: [() => next],
        asyncHandlers: [],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      throwingSetAppCtx,
      interceptThrowControl,
    );
    expect(interceptThrowControl.signalled).toBe(true);

    const asyncResolveControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await new Transceiver(new Kernel(), 'signalled-3').captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [() => 'ok'],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      asyncResolveControl,
    );
    await tick();
    expect(asyncResolveControl.signalled).toBe(true);

    const asyncRejectControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await new Transceiver(new Kernel(), 'signalled-4').captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [() => Promise.reject(new Error('nope'))],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      asyncRejectControl,
    );
    await tick();
    expect(asyncRejectControl.signalled).toBe(true);

    const inlineResolveControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await new Transceiver(new Kernel(), 'signalled-5').captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [],
        inlineHandlers: [() => 'inline-ok'],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      inlineResolveControl,
    );
    expect(inlineResolveControl.signalled).toBe(true);

    const inlineThrowControl = {
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    await new Transceiver(new Kernel(), 'signalled-6').captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [],
        inlineHandlers: [() => next],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      throwingSetAppCtx,
      inlineThrowControl,
    );
    expect(inlineThrowControl.signalled).toBe(true);
  });

  it('does not re-signal any branch once the control has already been signalled', async () => {
    const next = new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA);
    const throwingSetAppCtx = jest.fn(() => {
      throw new Error('boom');
    });
    const resolve = jest.fn();
    const reject = jest.fn();

    await new Transceiver(new Kernel(), 'presignalled-1').captureSignal(
      {
        interceptHandlers: [() => 'blocked'],
        asyncHandlers: [],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      { signal: { resolve, reject }, signalled: true },
    );
    expect(reject).not.toHaveBeenCalled();

    await new Transceiver(new Kernel(), 'presignalled-2').captureSignal(
      {
        interceptHandlers: [() => next],
        asyncHandlers: [],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      throwingSetAppCtx,
      { signal: { resolve, reject }, signalled: true },
    );
    expect(reject).not.toHaveBeenCalled();

    await new Transceiver(new Kernel(), 'presignalled-3').captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [
          () => 'resolved',
          () => Promise.reject(new Error('async fail')),
        ],
        inlineHandlers: [],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      { signal: { resolve, reject }, signalled: true },
    );
    await tick();
    expect(resolve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();

    await new Transceiver(new Kernel(), 'presignalled-4').captureSignal(
      {
        interceptHandlers: [],
        asyncHandlers: [],
        inlineHandlers: [() => 'inline-result', () => next],
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      throwingSetAppCtx,
      { signal: { resolve, reject }, signalled: true },
    );
    expect(resolve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });

  it('scopes addSignalHandler to its trigram and can be triggered through the signal network', async () => {
    const transceiver = new Transceiver(new Kernel(), 'signal-handler-scope');
    const targetHandler = jest.fn(() => 'target-result');
    transceiver.addSignalHandler(TARGET, targetHandler);

    const fire = (trigram) =>
      transceiver._signals.setAppCtxControl(
        new AppCtx(trigram.t, trigram.a, trigram.o, DATA),
        {
          transceiverId: transceiver._transceiverId,
          signal: { resolve: jest.fn(), reject: jest.fn() },
        },
      );

    fire(SOURCE);
    await tick();
    expect(targetHandler).not.toHaveBeenCalled();

    fire(TARGET);
    await tick();
    expect(targetHandler).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
  });

  it('adds and removes direct intercept/async/inline handlers, scoped to their trigram', async () => {
    const transceiver = new Transceiver(new Kernel(), 'direct-handlers');
    const intercept = jest.fn();
    const asyncHandler = jest.fn();
    const inline = jest.fn();
    transceiver.addInterceptHandler(TARGET, intercept);
    transceiver.addAsyncHandler(TARGET, asyncHandler);
    transceiver.addInlineHandler(TARGET, inline);

    const fire = (trigram) =>
      transceiver._signals.setAppCtxControl(
        new AppCtx(trigram.t, trigram.a, trigram.o, DATA),
        {
          transceiverId: transceiver._transceiverId,
          signal: { resolve: jest.fn(), reject: jest.fn() },
        },
      );

    fire(SOURCE);
    await tick();
    expect(intercept).not.toHaveBeenCalled();
    expect(asyncHandler).not.toHaveBeenCalled();
    expect(inline).not.toHaveBeenCalled();

    fire(TARGET);
    await tick();
    expect(intercept).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    expect(asyncHandler).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    expect(inline).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });

    transceiver.removeInterceptHandler(TARGET, intercept);
    transceiver.removeAsyncHandler(TARGET, asyncHandler);
    transceiver.removeInlineHandler(TARGET, inline);

    fire(TARGET);
    await tick();
    expect(intercept).toHaveBeenCalledTimes(1);
    expect(asyncHandler).toHaveBeenCalledTimes(1);
    expect(inline).toHaveBeenCalledTimes(1);
  });
});
