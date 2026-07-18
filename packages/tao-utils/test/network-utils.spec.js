import { AppCtx, Kernel } from '@tao.js/core';
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
    expect(() => new Source(kernel, jest.fn(), 'name', {})).toThrow(/fromSrc/);
    expect(
      new Source(kernel, jest.fn(), (callback) =>
        expect(callback).toBeInstanceOf(Function),
      ),
    ).toBeInstanceOf(Source);
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
    expect(
      new Relay(kernel, jest.fn(), (callback) =>
        expect(callback).toBeInstanceOf(Function),
      ),
    ).toBeInstanceOf(Relay);

    const toSrc = jest.fn();
    const relay = new Relay(kernel, toSrc, 'relay', () => {});
    relay.setCtx(SOURCE, DATA);

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

    expect(reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'capture failed' }),
    );
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
});
