import {
  AppCtx,
  Kernel,
  Network,
  INTERCEPT,
  ASYNC,
  INLINE,
  ERROR,
} from '@tao.js/core';
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
      enter: jest.fn(),
      decorate: jest.fn(() => () => {}),
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

    // v2 entries route through the envelope hop engine with channel cascade
    expect(network.enter).toHaveBeenCalledTimes(2);
    expect(network.enter).toHaveBeenNthCalledWith(1, expect.any(AppCtx), {
      cascade: { channelId: 'delegating' },
    });
    expect(network.enter).toHaveBeenNthCalledWith(2, appCtx, {
      cascade: { channelId: 'delegating' },
    });

    // caller-owned forwarding stays on the frozen legacy control path
    expect(network.setCtxControl).toHaveBeenCalledTimes(1);
    expect(network.setAppCtxControl).toHaveBeenCalledTimes(1);
    expect(network.setCtxControl).toHaveBeenCalledWith(
      expect.objectContaining(SOURCE),
      DATA,
      { existing: true, channelId: 'delegating' },
      expect.any(Function),
    );

    const ctxForward = network.setCtxControl.mock.calls[0][3];
    ctxForward(appCtx, { channelId: 'delegating' });
    expect(forward).toHaveBeenCalledWith(appCtx, {
      channelId: 'delegating',
    });

    const appCtxForward = network.setAppCtxControl.mock.calls[0][2];
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
    const network = {
      setAppCtxControl: jest.fn(),
      enter: jest.fn(),
      decorate: jest.fn(() => () => {}),
    };
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
    const network = {
      setAppCtxControl: jest.fn(),
      enter: jest.fn(),
      decorate: jest.fn(() => () => {}),
    };
    const channel = new Channel({ _network: network }, 'quiet');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    channel.forwardAppCtx(appCtx, { channelId: 'quiet' });

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('only forwards into its own channel when the control channelId matches', () => {
    const network = {
      setAppCtxControl: jest.fn(),
      enter: jest.fn(),
      decorate: jest.fn(() => () => {}),
    };
    const channel = new Channel({ _network: network }, 'match-only');
    const innerSpy = jest.spyOn(channel._channel, 'setAppCtxControl');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    channel.forwardAppCtx(appCtx, { channelId: 'someone-else' });
    expect(innerSpy).not.toHaveBeenCalled();

    channel.forwardAppCtx(appCtx, { channelId: 'match-only' });
    expect(innerSpy).toHaveBeenCalledTimes(1);
  });

  it('routes the internal channel setAppCtxControl callback through setAppCtx', () => {
    const network = {
      setAppCtxControl: jest.fn(),
      enter: jest.fn(),
      decorate: jest.fn(() => () => {}),
    };
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

  it('mirrors chained AppCons to channel handlers through the network decoration', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'wiring');
    const other = new Channel(kernel, 'other-channel');
    const mirrored = jest.fn();
    const leaked = jest.fn();
    const kernelSeen = jest.fn();
    channel.addInlineHandler(TARGET, mirrored);
    other.addInlineHandler(TARGET, leaked);
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    kernel.addInlineHandler(TARGET, kernelSeen);

    channel.setCtx(SOURCE, DATA);
    await tick();

    // the chained AppCon reached main-network handlers AND this channel's
    expect(kernelSeen).toHaveBeenCalledTimes(1);
    expect(mirrored).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    // but never another channel's handlers
    expect(leaked).not.toHaveBeenCalled();

    // kernel-entered cascades never mirror into channels
    mirrored.mockClear();
    kernel.setCtx(SOURCE, DATA);
    await tick();
    expect(mirrored).not.toHaveBeenCalled();
  });

  it('stops mirroring after dispose', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'disposable');
    const mirrored = jest.fn();
    channel.addInlineHandler(TARGET, mirrored);
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );

    channel.setCtx(SOURCE, DATA);
    await tick();
    expect(mirrored).toHaveBeenCalledTimes(1);

    channel.dispose();
    channel.setCtx(SOURCE, DATA);
    await tick();
    expect(mirrored).toHaveBeenCalledTimes(1);
  });

  it('merges channel control into setCtxControl/setAppCtxControl calls and forwards optionally', () => {
    const network = {
      enter: jest.fn(),
      decorate: jest.fn(() => () => {}),
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

    // calling without an optional forwardAppCtx routes through the hop engine
    channel.setCtxControl(SOURCE, DATA, { existing: true });
    expect(network.setCtxControl).toHaveBeenCalledTimes(1);
    expect(network.enter).toHaveBeenCalledWith(expect.any(AppCtx), {
      cascade: { existing: true, channelId: 'merging' },
    });

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
    // network.setAppCtxControl again - clear that noise before the v2 check
    network.setAppCtxControl.mockClear();
    network.enter.mockClear();

    channel.setAppCtxControl(appCtx, { existing: true });
    expect(network.setAppCtxControl).not.toHaveBeenCalled();
    expect(network.enter).toHaveBeenCalledWith(appCtx, {
      cascade: { existing: true, channelId: 'merging' },
    });
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
  it('captures intercept, async, and inline signal handler outcomes end to end', async () => {
    // intercept returning an AppCtx chains it into the signal network
    const chainKernel = new Kernel();
    const chainTransceiver = new Transceiver(chainKernel, 'capture-chain');
    const CHAINED = { t: 'chainlink', a: 'follow', o: 'jest' };
    chainKernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    chainTransceiver.addInterceptHandler(
      TARGET,
      () => new AppCtx(CHAINED.t, CHAINED.a, CHAINED.o, DATA),
    );
    chainTransceiver.addInlineHandler(CHAINED, () => 'chained complete');
    await expect(chainTransceiver.setCtx(SOURCE, DATA)).resolves.toBe(
      'chained complete',
    );

    // async result resolves even while an inline handler chains an AppCtx
    const asyncKernel = new Kernel();
    const asyncTransceiver = new Transceiver(asyncKernel, 'capture-async');
    asyncKernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    asyncTransceiver.addAsyncHandler(TARGET, () => 'async result');
    await expect(asyncTransceiver.setCtx(SOURCE, DATA)).resolves.toBe(
      'async result',
    );
  });

  it('rejects when signal handlers throw in any phase', async () => {
    // a throwing inline signal handler rejects the promise
    const inlineKernel = new Kernel();
    const inlineTransceiver = new Transceiver(inlineKernel, 'throw-inline');
    inlineKernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    inlineTransceiver.addInlineHandler(TARGET, () => {
      throw new Error('handler failed');
    });
    await expect(inlineTransceiver.setCtx(SOURCE, DATA)).rejects.toThrow(
      'handler failed',
    );

    // a rejecting async signal handler rejects the promise
    const asyncKernel = new Kernel();
    const asyncTransceiver = new Transceiver(asyncKernel, 'throw-async');
    asyncKernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    asyncTransceiver.addAsyncHandler(TARGET, () =>
      Promise.reject(new Error('async failed')),
    );
    await expect(asyncTransceiver.setCtx(SOURCE, DATA)).rejects.toThrow(
      'async failed',
    );

    // a throwing intercept signal handler rejects the promise
    const interceptKernel = new Kernel();
    const interceptTransceiver = new Transceiver(
      interceptKernel,
      'throw-intercept',
    );
    interceptKernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    interceptTransceiver.addInterceptHandler(TARGET, () => {
      throw new Error('intercept failed');
    });
    await expect(interceptTransceiver.setCtx(SOURCE, DATA)).rejects.toThrow(
      'intercept failed',
    );
  });

  it('maps settlement phases onto the signal promise', () => {
    const transceiver = new Transceiver(new Kernel(), 'mapping');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const capture = (control) => {
      let hooks = null;
      transceiver.handleSignalAppCon(
        { handleAppCon: (ac, fwd, ctl, h) => (hooks = h) },
        appCtx,
        jest.fn(),
        control,
      );
      return hooks;
    };

    // intercept phase rejects
    const interceptControl = {
      transceiverId: 'mapping',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    capture(interceptControl).onReturn(INTERCEPT, 'stopped', appCtx);
    expect(interceptControl.signal.reject).toHaveBeenCalledWith('stopped');
    expect(interceptControl.signalled).toBe(true);

    // error phase rejects
    const errorControl = {
      transceiverId: 'mapping',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    const failure = new Error('dispatch failed');
    capture(errorControl).onReturn(ERROR, failure, appCtx);
    expect(errorControl.signal.reject).toHaveBeenCalledWith(failure);

    // async and inline phases resolve
    const asyncControl = {
      transceiverId: 'mapping',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    capture(asyncControl).onReturn(ASYNC, 'async value', appCtx);
    expect(asyncControl.signal.resolve).toHaveBeenCalledWith('async value');

    const inlineControl = {
      transceiverId: 'mapping',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    capture(inlineControl).onReturn(INLINE, 'inline value', appCtx);
    expect(inlineControl.signal.resolve).toHaveBeenCalledWith('inline value');
  });

  it('rejects signals when dispatch fails asynchronously', async () => {
    const transceiver = new Transceiver(new Kernel(), 'capture-error');
    const reject = jest.fn();
    const control = {
      transceiverId: transceiver._transceiverId,
      signal: { resolve: jest.fn(), reject },
    };

    transceiver.handleSignalAppCon(
      {
        handleAppCon: async (ac, fwd, ctl, hooks) => {
          await tick();
          hooks.onReturn(ERROR, new Error('capture failed'), ac);
        },
      },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      control,
    );
    await tick();
    await tick();

    expect(reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'capture failed' }),
    );
    expect(control.signalled).toBe(true);
  });

  it('does not settle a late failure once the control was already signalled', async () => {
    const transceiver = new Transceiver(
      new Kernel(),
      'capture-error-signalled',
    );
    const reject = jest.fn();
    const control = {
      transceiverId: transceiver._transceiverId,
      signal: { resolve: jest.fn(), reject },
    };
    let hooks = null;

    transceiver.handleSignalAppCon(
      { handleAppCon: (ac, fwd, ctl, h) => (hooks = h) },
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      control,
    );
    // settled elsewhere while dispatch was in flight
    control.signalled = true;
    hooks.onReturn(ERROR, new Error('capture failed'));

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

  it('chains AppCtx values returned by async signal handlers', async () => {
    const kernel = new Kernel();
    const transceiver = new Transceiver(kernel, 'async-appctx');
    const CHAINED = { t: 'asynclink', a: 'follow', o: 'jest' };
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    transceiver.addAsyncHandler(
      TARGET,
      () => new AppCtx(CHAINED.t, CHAINED.a, CHAINED.o, DATA),
    );
    transceiver.addInlineHandler(CHAINED, () => 'async chained');

    await expect(transceiver.setCtx(SOURCE, DATA)).resolves.toBe(
      'async chained',
    );
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
    const network = { setAppCtxControl: jest.fn(), enter: jest.fn() };
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

  it('only dispatches settlement when control matches and has not already signalled', () => {
    const transceiver = new Transceiver(new Kernel(), 'guarded');
    const handler = { handleAppCon: jest.fn() };
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const forward = jest.fn();

    transceiver.handleSignalAppCon(handler, appCtx, forward, {
      transceiverId: 'someone-else',
      signal: {},
    });
    expect(handler.handleAppCon).not.toHaveBeenCalled();

    transceiver.handleSignalAppCon(handler, appCtx, forward, {
      transceiverId: 'guarded',
      signal: null,
    });
    expect(handler.handleAppCon).not.toHaveBeenCalled();

    transceiver.handleSignalAppCon(handler, appCtx, forward, {
      transceiverId: 'guarded',
      signal: {},
      signalled: true,
    });
    expect(handler.handleAppCon).not.toHaveBeenCalled();

    const control = { transceiverId: 'guarded', signal: {} };
    transceiver.handleSignalAppCon(handler, appCtx, forward, control);
    expect(handler.handleAppCon).toHaveBeenCalledTimes(1);
    expect(handler.handleAppCon).toHaveBeenCalledWith(
      appCtx,
      forward,
      control,
      expect.objectContaining({ onReturn: expect.any(Function) }),
    );
  });

  it('rejects synchronously if the handler cannot be dispatched', () => {
    const transceiver = new Transceiver(new Kernel(), 'sync-throw');
    const reject = jest.fn();
    const control = {
      transceiverId: transceiver._transceiverId,
      signal: { resolve: jest.fn(), reject },
    };

    // a malformed handler with no handleAppCon throws synchronously
    transceiver.handleSignalAppCon(
      {},
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      jest.fn(),
      control,
    );

    expect(reject).toHaveBeenCalledWith(expect.any(TypeError));
    expect(control.signalled).toBe(true);
  });

  it('passes the exact trigram to signal handlers, not a stray object', async () => {
    const kernel = new Kernel();
    const transceiver = new Transceiver(kernel, 'trigram-shape');
    const seenIntercept = [];
    const seenInline = [];
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    transceiver.addInterceptHandler(TARGET, (tao) => {
      seenIntercept.push(tao);
      return null;
    });
    transceiver.addInlineHandler(TARGET, (tao) => {
      seenInline.push(tao);
      return 'shape-checked';
    });

    await expect(transceiver.setCtx(SOURCE, DATA)).resolves.toBe(
      'shape-checked',
    );
    expect(seenIntercept).toEqual([{ t: TARGET.t, a: TARGET.a, o: TARGET.o }]);
    expect(seenInline).toEqual([{ t: TARGET.t, a: TARGET.a, o: TARGET.o }]);
  });

  it('does not settle when signal handlers return nullish', async () => {
    const kernel = new Kernel();
    const transceiver = new Transceiver(kernel, 'nullish');
    const settled = jest.fn();
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    transceiver.addAsyncHandler(TARGET, () => null);
    transceiver.addInlineHandler(TARGET, () => undefined);

    transceiver.setCtx(SOURCE, DATA).then(settled, settled);
    await tick();
    await tick();

    expect(settled).not.toHaveBeenCalled();
  });

  it('resolves using only the first non-AppCtx inline result', async () => {
    const kernel = new Kernel();
    const transceiver = new Transceiver(kernel, 'inline-first');
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    transceiver.addInlineHandler(TARGET, () => 'first');
    transceiver.addInlineHandler(TARGET, () => 'second');

    await expect(transceiver.setCtx(SOURCE, DATA)).resolves.toBe('first');
  });

  it('marks the control as signalled on the first settlement of either outcome', () => {
    const transceiver = new Transceiver(new Kernel(), 'signalled');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const capture = (control) => {
      let hooks = null;
      transceiver.handleSignalAppCon(
        { handleAppCon: (ac, fwd, ctl, h) => (hooks = h) },
        appCtx,
        jest.fn(),
        control,
      );
      return hooks;
    };

    const resolveControl = {
      transceiverId: 'signalled',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    capture(resolveControl).onReturn(INLINE, 'ok', appCtx);
    expect(resolveControl.signalled).toBe(true);
    expect(resolveControl.signal.resolve).toHaveBeenCalledWith('ok');

    const rejectControl = {
      transceiverId: 'signalled',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    capture(rejectControl).onReturn(ERROR, new Error('nope'), appCtx);
    expect(rejectControl.signalled).toBe(true);
    expect(rejectControl.signal.reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'nope' }),
    );
  });

  it('does not re-signal any branch once the control has already been signalled', () => {
    const transceiver = new Transceiver(new Kernel(), 'settle-once');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const control = {
      transceiverId: 'settle-once',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    let hooks = null;
    transceiver.handleSignalAppCon(
      { handleAppCon: (ac, fwd, ctl, h) => (hooks = h) },
      appCtx,
      jest.fn(),
      control,
    );

    hooks.onReturn(INLINE, 'first', appCtx);
    hooks.onReturn(ERROR, new Error('late failure'), appCtx);
    hooks.onReturn(ASYNC, 'late value', appCtx);
    hooks.onReturn(INTERCEPT, 'late halt', appCtx);

    expect(control.signal.resolve).toHaveBeenCalledTimes(1);
    expect(control.signal.resolve).toHaveBeenCalledWith('first');
    expect(control.signal.reject).not.toHaveBeenCalled();
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

describe('envelope version guards', () => {
  const OLD_CORE_NETWORK = () => ({
    use: () => {},
    stop: () => {},
    setCtxControl: () => {},
    setAppCtxControl: () => {},
  });

  it('Channel throws a clear error on a pre-envelope core', () => {
    expect(() => new Channel({ _network: OLD_CORE_NETWORK() }, 'old')).toThrow(
      /envelope support/,
    );
  });

  it('Source throws a clear error on a pre-envelope core', () => {
    expect(
      () => new Source({ _network: OLD_CORE_NETWORK() }, jest.fn()),
    ).toThrow(/envelope support/);
  });

  it('Relay throws a clear error on a pre-envelope core', () => {
    expect(
      () =>
        new Relay({ _network: OLD_CORE_NETWORK() }, jest.fn(), 'r', jest.fn()),
    ).toThrow(/envelope support/);
  });

  it('Transceiver throws a clear error on a pre-envelope core', () => {
    expect(() => new Transceiver({ _network: OLD_CORE_NETWORK() })).toThrow(
      /envelope support/,
    );
  });
});

describe('Channel entry trigram normalization', () => {
  it('builds the entered AppCtx from short or long trigram keys', () => {
    const network = {
      enter: jest.fn(),
      decorate: jest.fn(() => () => {}),
      setCtxControl: jest.fn(),
      setAppCtxControl: jest.fn(),
    };
    const channel = new Channel({ _network: network }, 'normalizing');

    channel.setCtxControl({ t: 'Short', a: 'Key', o: 'Form' }, DATA, {});
    channel.setCtxControl(
      { term: 'Long', action: 'Key', orient: 'Form' },
      DATA,
      {},
    );

    const [shortAc] = network.enter.mock.calls[0];
    expect(shortAc.unwrapCtx()).toEqual({ t: 'Short', a: 'Key', o: 'Form' });
    const [longAc] = network.enter.mock.calls[1];
    expect(longAc.unwrapCtx()).toEqual({ t: 'Long', a: 'Key', o: 'Form' });
  });
});

describe('Source under legacy dispatches', () => {
  it('emits legacy-dispatched AppCons and suppresses its own legacy source marker', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    const source = new Source(kernel, toSrc, 'legacy-source');

    // legacy caller-owned dispatch without a source marker: emitted
    kernel._network.setCtxControl(SOURCE, DATA, { other: true }, () => {});
    expect(toSrc).toHaveBeenCalledTimes(1);

    // legacy dispatch carrying this source's marker on control: suppressed
    kernel._network.setCtxControl(
      SOURCE,
      DATA,
      { source: 'legacy-source' },
      () => {},
    );
    expect(toSrc).toHaveBeenCalledTimes(1);

    // a different source name on control: emitted
    kernel._network.setCtxControl(
      SOURCE,
      DATA,
      { source: 'someone-else' },
      () => {},
    );
    expect(toSrc).toHaveBeenCalledTimes(2);
    source.dispose();
  });
});

describe('Transponder entry modes', () => {
  it('propagates chains when attached directly to a kernel network', async () => {
    const kernel = new Kernel();
    const transponder = new Transponder(kernel, 'direct-chains', 0);
    const chained = jest.fn();
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    kernel.addInlineHandler(TARGET, chained);

    const viaCtx = await transponder.setCtx(SOURCE, DATA);
    await tick();
    expect(viaCtx).toBeInstanceOf(AppCtx);
    expect(chained).toHaveBeenCalledTimes(1);

    const viaAppCtx = await transponder.setAppCtx(
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
    );
    await tick();
    expect(viaAppCtx).toBeInstanceOf(AppCtx);
    expect(chained).toHaveBeenCalledTimes(2);
  });

  it('resolves through a wrapped Channel with chains still propagating', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'transponder-channel');
    const transponder = new Transponder(channel, 'via-channel', 0);
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );

    const settled = await transponder.setCtx(SOURCE, DATA);
    expect(settled).toBeInstanceOf(AppCtx);
    expect(settled.unwrapCtx()).toEqual(TARGET);
  });

  it('falls back to legacy control entries on a pre-envelope network', () => {
    const network = {
      use: () => {},
      setCtxControl: jest.fn(),
      setAppCtxControl: jest.fn(),
    };
    const transponder = new Transponder({ _network: network }, 'old-net', 0);

    transponder.setCtx(SOURCE, DATA);
    expect(network.setCtxControl).toHaveBeenCalledWith(
      expect.objectContaining(SOURCE),
      DATA,
      expect.objectContaining({ transponderId: 'old-net' }),
    );

    transponder.setAppCtx(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA));
    expect(network.setAppCtxControl).toHaveBeenCalledWith(
      expect.any(AppCtx),
      expect.objectContaining({ transponderId: 'old-net' }),
    );
  });
});
