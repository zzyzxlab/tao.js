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
import seive from '../src/seive';
import trigramFilter from '../src/trigram-filter';

const SOURCE = { t: 'Source', a: 'Load', o: 'Page' };
const TARGET = { t: 'Target', a: 'Show', o: 'Page' };
const CHAINED = { t: 'Chained', a: 'Follow', o: 'Page' };
const OTHER = { t: 'Other', a: 'Miss', o: 'Page' };
const DATA = {
  Source: { id: 1 },
  Load: { pending: false },
  Page: { current: true },
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// envelope-capable mock network: decorate returns a dispose fn
const mockNetwork = () => ({
  enter: jest.fn(),
  decorate: jest.fn(() => jest.fn()),
});

describe('Channel', () => {
  it('registers an onForward decoration and delegates entries through the envelope gate', () => {
    const network = mockNetwork();
    const channel = new Channel({ _network: network }, 'delegating');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    expect(network.decorate).toHaveBeenCalledTimes(1);
    expect(network.decorate).toHaveBeenCalledWith(
      expect.objectContaining({ onForward: expect.any(Function) }),
    );

    channel.setCtx(SOURCE, DATA);
    channel.setAppCtx(appCtx);

    // v2 entries route through the envelope hop engine with channel cascade
    expect(network.enter).toHaveBeenCalledTimes(2);
    expect(network.enter).toHaveBeenNthCalledWith(1, expect.any(AppCtx), {
      cascade: { channelId: 'delegating' },
      hop: {},
      chain: null,
    });
    expect(network.enter).toHaveBeenNthCalledWith(2, appCtx, {
      cascade: { channelId: 'delegating' },
      hop: {},
      chain: null,
    });
  });

  it('merges caller cascades on enter with the channel tag winning key conflicts', () => {
    const network = mockNetwork();
    const channel = new Channel({ _network: network }, 'merging');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const hop = { source: 'entry' };
    const chain = { trace: { spanId: 7 } };

    channel.enter(appCtx, {
      cascade: { existing: true, channelId: 'spoofed' },
      hop,
      chain,
    });

    expect(network.enter).toHaveBeenCalledTimes(1);
    const [enteredAc, opts] = network.enter.mock.calls[0];
    expect(enteredAc).toBe(appCtx);
    expect(opts.cascade).toEqual({ existing: true, channelId: 'merging' });
    expect(opts.hop).toBe(hop);
    expect(opts.chain).toBe(chain);
  });

  it('runs channel-attached handlers of every type on mirrored cascades and supports removal', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'channel-id');
    const received = jest.fn();
    const intercept = jest.fn();
    const asyncHandler = jest.fn();
    const inline = jest.fn();
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );

    expect(channel.addInterceptHandler(TARGET, intercept)).toBe(channel);
    expect(channel.addAsyncHandler(TARGET, asyncHandler)).toBe(channel);
    expect(channel.addInlineHandler(TARGET, inline)).toBe(channel);
    channel.addInlineHandler(TARGET, received);
    channel.setCtx(SOURCE, DATA);
    await tick();

    expect(intercept).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    expect(asyncHandler).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    expect(inline).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    expect(received).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });

    expect(channel.removeInterceptHandler(TARGET, intercept)).toBe(channel);
    expect(channel.removeAsyncHandler(TARGET, asyncHandler)).toBe(channel);
    expect(channel.removeInlineHandler(TARGET, inline)).toBe(channel);
    channel.setCtx(SOURCE, DATA);
    await tick();
    expect(intercept).toHaveBeenCalledTimes(1);
    expect(asyncHandler).toHaveBeenCalledTimes(1);
    expect(inline).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledTimes(2);
  });

  it('clones a channel whose handlers actually dispatch on cloned cascades', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'clone-parent');
    const mirrored = jest.fn();
    const parentOnly = jest.fn();
    channel.addInlineHandler(TARGET, mirrored);
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );

    const clone = channel.clone();
    // added after cloning: must stay parent-only
    channel.addInlineHandler(TARGET, parentOnly);
    expect(clone).toBeInstanceOf(Channel);
    expect(clone._channelId).not.toBe(channel._channelId);

    clone.setCtx(SOURCE, DATA);
    await tick();

    // the clone's private network dispatches for the clone's own cascade
    expect(mirrored).toHaveBeenCalledTimes(1);
    expect(mirrored).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    // and the parent channel does not receive the clone's cascade
    expect(parentOnly).not.toHaveBeenCalled();
  });

  it('proxies decorate onto its private network and disposes cleanly', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'decorated');
    const observed = jest.fn();
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    const dispose = channel.decorate({
      name: 'observer',
      onDispatch: (ac, envelope) => observed(ac, envelope.cascade.channelId),
    });
    expect(dispose).toBeInstanceOf(Function);

    channel.setCtx(SOURCE, DATA);
    await tick();
    // only the mirrored chained hop dispatches on the private network
    expect(observed).toHaveBeenCalledTimes(1);
    const [mirroredAc, channelId] = observed.mock.calls[0];
    expect(mirroredAc.unwrapCtx()).toEqual(TARGET);
    expect(channelId).toBe('decorated');

    dispose();
    channel.setCtx(SOURCE, DATA);
    await tick();
    expect(observed).toHaveBeenCalledTimes(1);
  });

  it('logs debug mirroring and only mirrors its own cascades', () => {
    const network = mockNetwork();
    const channel = new Channel({ _network: network }, 'debug', true);
    const innerEnter = jest.spyOn(channel._channel, 'enter');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const { onForward } = network.decorate.mock.calls[0][0];

    onForward(
      appCtx,
      { cascade: { channelId: 'other' } },
      {
        forward: jest.fn(),
      },
    );
    expect(innerEnter).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();

    onForward(
      appCtx,
      { cascade: { channelId: 'debug' } },
      {
        forward: jest.fn(),
      },
    );
    expect(innerEnter).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('generates IDs and accepts Network instances directly', () => {
    const channel = new Channel(new Network());

    expect(channel._channelId).toEqual(expect.any(Number));
    expect(channel._network).toBeInstanceOf(Network);
  });

  it('does not log by default when debug is left unset', () => {
    const network = mockNetwork();
    const channel = new Channel({ _network: network }, 'quiet');
    const innerEnter = jest.spyOn(channel._channel, 'enter');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const { onForward } = network.decorate.mock.calls[0][0];

    onForward(
      appCtx,
      { cascade: { channelId: 'quiet' } },
      {
        forward: jest.fn(),
      },
    );

    expect(innerEnter).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('mirrors with the shared cascade and the hop forward so channel chains continue the envelope', () => {
    const network = mockNetwork();
    const channel = new Channel({ _network: network }, 'continuing');
    const innerEnter = jest.spyOn(channel._channel, 'enter');
    const { onForward } = network.decorate.mock.calls[0][0];
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const cascade = { channelId: 'continuing', extra: true };
    const forward = jest.fn();

    onForward(appCtx, { cascade, hop: {}, chain: {} }, { from: null, forward });

    expect(innerEnter).toHaveBeenCalledTimes(1);
    const [mirroredAc, opts] = innerEnter.mock.calls[0];
    expect(mirroredAc).toBe(appCtx);
    // the SAME cascade continues (no fresh envelope), and chained AppCons
    // from channel handlers route through the main network's hop engine
    expect(opts.cascade).toBe(cascade);
    expect(opts.forward).toBe(forward);
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

  it('continues chains from channel-attached handlers on the shared cascade envelope', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'causal');
    const mainSaw = jest.fn();
    const channelSawChained = jest.fn();
    const cascades = [];
    kernel._network.decorate({
      name: 'cascade-probe',
      onDispatch: (ac, envelope) => {
        cascades.push(envelope.cascade);
      },
    });
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    // a CHANNEL-ATTACHED handler chains the next AppCtx
    channel.addInlineHandler(
      TARGET,
      () => new AppCtx(CHAINED.t, CHAINED.a, CHAINED.o, DATA),
    );
    // NEW 0.19 behavior: channel handlers see chains from channel handlers
    channel.addInlineHandler(CHAINED, channelSawChained);
    kernel.addInlineHandler(CHAINED, mainSaw);

    channel.setCtx(SOURCE, DATA);
    await tick();

    // (a) the channel-handler chain dispatched to main-network handlers
    expect(mainSaw).toHaveBeenCalledTimes(1);
    expect(mainSaw).toHaveBeenCalledWith(CHAINED, { Page: DATA.Page });
    // (b) the chain retained the channel cascade: a second channel-attached
    // handler for the chained trigram received it
    expect(channelSawChained).toHaveBeenCalledTimes(1);
    expect(channelSawChained).toHaveBeenCalledWith(CHAINED, {
      Page: DATA.Page,
    });
    // (c) the cascade control object is the SAME reference across all hops
    expect(cascades).toHaveLength(3);
    expect(cascades[0]).toEqual({ channelId: 'causal' });
    expect(cascades[1]).toBe(cascades[0]);
    expect(cascades[2]).toBe(cascades[0]);
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

  it('scopes add*Handler registrations to the trigram they were given', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'scoped');
    const intercept = jest.fn();
    const asyncHandler = jest.fn();
    const inline = jest.fn();
    const matched = jest.fn();
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );

    channel.addInterceptHandler(OTHER, intercept);
    channel.addAsyncHandler(OTHER, asyncHandler);
    channel.addInlineHandler(OTHER, inline);
    channel.addInlineHandler(TARGET, matched);

    channel.setCtx(SOURCE, DATA);
    await tick();

    expect(intercept).not.toHaveBeenCalled();
    expect(asyncHandler).not.toHaveBeenCalled();
    expect(inline).not.toHaveBeenCalled();
    expect(matched).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
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
    expect(stop).toBeInstanceOf(Function);

    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);

    received.mockClear();
    source._network.enter(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA), {
      cascade: { channelId: channel._channelId },
    });
    expect(received).not.toHaveBeenCalled();

    stop();
    source.setCtx(SOURCE, DATA);
    expect(received).not.toHaveBeenCalled();
  });
});

describe('Source and Relay', () => {
  it('binds Source input, ignores its echo, and disposes its decoration', () => {
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

  it('enters with its hop marker and emits through its onDispatch decoration', () => {
    const network = mockNetwork();
    const toSrc = jest.fn();
    const source = new Source({ _network: network }, toSrc, 'wired');

    expect(network.decorate).toHaveBeenCalledTimes(1);
    expect(network.decorate).toHaveBeenCalledWith(
      expect.objectContaining({ onDispatch: expect.any(Function) }),
    );

    source.setCtx({ term: 'Long', action: 'Key', orient: 'Form' }, DATA);
    expect(network.enter).toHaveBeenCalledTimes(1);
    const [enteredAc, opts] = network.enter.mock.calls[0];
    expect(enteredAc.unwrapCtx()).toEqual({ t: 'Long', a: 'Key', o: 'Form' });
    expect(opts).toEqual({ hop: { source: 'wired' } });

    const { onDispatch } = network.decorate.mock.calls[0][0];
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    onDispatch(appCtx, { hop: { source: 'wired' } });
    expect(toSrc).not.toHaveBeenCalled();
    onDispatch(appCtx, { hop: {} });
    expect(toSrc).toHaveBeenCalledTimes(1);
    expect(toSrc).toHaveBeenCalledWith(appCtx.unwrapCtx(), appCtx.data);
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

  it('emits chained AppCons back out after suppressing the arriving hop', async () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    let receiveFromSource;
    new Source(kernel, toSrc, 'reflex', (callback) => {
      receiveFromSource = callback;
    });
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );

    receiveFromSource(SOURCE, DATA);
    await tick();

    // the arriving hop is suppressed; the chained response hop is emitted
    // (the source marker rides the entry hop only - the bidirectional reflex)
    expect(toSrc).toHaveBeenCalledTimes(1);
    expect(toSrc).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
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

  it('invokes toSrc only when the envelope hop does not carry its own source marker', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    const relay = new Relay(kernel, toSrc, 'direct-relay', () => {});
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    relay.handleAppCon(appCtx, { hop: {} });
    expect(toSrc).toHaveBeenCalledWith(appCtx.unwrapCtx(), appCtx.data);

    toSrc.mockClear();
    relay.handleAppCon(appCtx, { hop: { source: 'direct-relay' } });
    expect(toSrc).not.toHaveBeenCalled();

    relay.handleAppCon(appCtx, { hop: { source: 'someone-else' } });
    expect(toSrc).toHaveBeenCalledTimes(1);

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

  it('enters through the envelope gate and resolves when the cascade signal fires', async () => {
    const network = mockNetwork();
    const transponder = new Transponder({ _network: network }, 'entering');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    transponder.setCtx({ term: 'Long', action: 'Key', orient: 'Form' }, DATA);
    expect(network.enter).toHaveBeenCalledTimes(1);
    const [normalizedAc, ctxOpts] = network.enter.mock.calls[0];
    expect(normalizedAc.unwrapCtx()).toEqual({
      t: 'Long',
      a: 'Key',
      o: 'Form',
    });
    expect(ctxOpts).toEqual({
      cascade: { transponderId: 'entering', signal: expect.any(Function) },
    });

    const result = transponder.setAppCtx(appCtx);
    const [enteredAc, opts] = network.enter.mock.calls[1];
    expect(enteredAc).toBe(appCtx);
    expect(opts).toEqual({
      cascade: { transponderId: 'entering', signal: expect.any(Function) },
    });

    opts.cascade.signal(appCtx);
    await expect(result).resolves.toBe(appCtx);
  });

  it('signals through its onDispatch decoration with the envelope cascade', () => {
    const network = mockNetwork();
    const transponder = new Transponder({ _network: network }, 'wired');
    const { onDispatch } = network.decorate.mock.calls[0][0];
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const signal = jest.fn();
    const cascade = { transponderId: 'wired', signal };

    onDispatch(appCtx, { cascade }, null, jest.fn());

    expect(signal).toHaveBeenCalledWith(appCtx);
    expect(cascade.signalled).toBe(true);
  });

  it('re-decorates on attach after detach and stays idempotent both ways', () => {
    const disposes = [jest.fn(), jest.fn()];
    let decorations = 0;
    const network = {
      enter: jest.fn(),
      decorate: jest.fn(() => disposes[decorations++]),
    };
    const transponder = new Transponder({ _network: network }, 'lifecycle');
    expect(network.decorate).toHaveBeenCalledTimes(1);
    const spec = network.decorate.mock.calls[0][0];

    // already attached: attach is a no-op
    expect(transponder.attach()).toBe(transponder);
    expect(network.decorate).toHaveBeenCalledTimes(1);

    expect(transponder.detach()).toBe(transponder);
    expect(disposes[0]).toHaveBeenCalledTimes(1);

    // already detached: detach is a no-op
    expect(transponder.detach()).toBe(transponder);
    expect(disposes[0]).toHaveBeenCalledTimes(1);

    // attach re-registers the SAME decoration spec
    expect(transponder.attach()).toBe(transponder);
    expect(network.decorate).toHaveBeenCalledTimes(2);
    expect(network.decorate.mock.calls[1][0]).toBe(spec);
  });

  it('resolves again after a detach/attach round trip', async () => {
    const kernel = new Kernel();
    const transponder = new Transponder(kernel, 'roundtrip');
    transponder.detach();
    transponder.attach();
    const entered = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    await expect(transponder.setAppCtx(entered)).resolves.toBe(entered);
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
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const signal = jest.fn();

    transponder.handleSignalAppCon(appCtx, {
      transponderId: transponder._transponderId,
      signal,
    });

    expect(signal).toHaveBeenCalledWith(appCtx);
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
      new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
      { transponderId: transponder._transponderId, signal },
    );

    expect(signal).toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('only signals once per control, ignoring mismatched or already-signalled controls', () => {
    const transponder = new Transponder(new Kernel(), 'signal-guard');
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);

    const mismatched = { transponderId: 'someone-else', signal: jest.fn() };
    transponder.handleSignalAppCon(appCtx, mismatched);
    expect(mismatched.signal).not.toHaveBeenCalled();
    expect(mismatched.signalled).toBeUndefined();

    const noSignal = { transponderId: transponder._transponderId };
    expect(() =>
      transponder.handleSignalAppCon(appCtx, noSignal),
    ).not.toThrow();
    expect(noSignal.signalled).toBeUndefined();

    const alreadySignalled = {
      transponderId: transponder._transponderId,
      signal: jest.fn(),
      signalled: true,
    };
    transponder.handleSignalAppCon(appCtx, alreadySignalled);
    expect(alreadySignalled.signal).not.toHaveBeenCalled();

    const matching = {
      transponderId: transponder._transponderId,
      signal: jest.fn(),
    };
    transponder.handleSignalAppCon(appCtx, matching);
    expect(matching.signal).toHaveBeenCalledWith(appCtx);
    expect(matching.signalled).toBe(true);
  });
});

describe('Transceiver', () => {
  it('captures intercept, async, and inline signal handler outcomes end to end', async () => {
    // intercept returning an AppCtx chains it into the signal network
    const chainKernel = new Kernel();
    const chainTransceiver = new Transceiver(chainKernel, 'capture-chain');
    const CHAIN_LINK = { t: 'chainlink', a: 'follow', o: 'jest' };
    chainKernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    chainTransceiver.addInterceptHandler(
      TARGET,
      () => new AppCtx(CHAIN_LINK.t, CHAIN_LINK.a, CHAIN_LINK.o, DATA),
    );
    chainTransceiver.addInlineHandler(CHAIN_LINK, () => 'chained complete');
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
    const control = () => ({
      transceiverId: 'mapping',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    });

    // intercept phase rejects
    const intercepted = control();
    transceiver._settle(INTERCEPT, 'stopped', intercepted);
    expect(intercepted.signal.reject).toHaveBeenCalledWith('stopped');
    expect(intercepted.signal.resolve).not.toHaveBeenCalled();
    expect(intercepted.signalled).toBe(true);

    // error phase rejects
    const errored = control();
    const failure = new Error('dispatch failed');
    transceiver._settle(ERROR, failure, errored);
    expect(errored.signal.reject).toHaveBeenCalledWith(failure);
    expect(errored.signal.resolve).not.toHaveBeenCalled();

    // async and inline phases resolve
    const asyncControl = control();
    transceiver._settle(ASYNC, 'async value', asyncControl);
    expect(asyncControl.signal.resolve).toHaveBeenCalledWith('async value');
    expect(asyncControl.signal.reject).not.toHaveBeenCalled();

    const inlineControl = control();
    transceiver._settle(INLINE, 'inline value', inlineControl);
    expect(inlineControl.signal.resolve).toHaveBeenCalledWith('inline value');
    expect(inlineControl.signal.reject).not.toHaveBeenCalled();
  });

  it('only settles matching, signallable, not-yet-signalled controls', () => {
    const transceiver = new Transceiver(new Kernel(), 'guarded');

    const mismatched = {
      transceiverId: 'someone-else',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    transceiver._settle(INLINE, 'ignored', mismatched);
    expect(mismatched.signal.resolve).not.toHaveBeenCalled();
    expect(mismatched.signalled).toBeUndefined();

    const unsignallable = { transceiverId: 'guarded', signal: null };
    expect(() =>
      transceiver._settle(INLINE, 'ignored', unsignallable),
    ).not.toThrow();
    expect(unsignallable.signalled).toBeUndefined();

    // settled elsewhere while dispatch was in flight: a late failure is dropped
    const late = {
      transceiverId: 'guarded',
      signal: { resolve: jest.fn(), reject: jest.fn() },
      signalled: true,
    };
    transceiver._settle(ERROR, new Error('late failure'), late);
    expect(late.signal.reject).not.toHaveBeenCalled();
    expect(late.signal.resolve).not.toHaveBeenCalled();
  });

  it('marks the control as signalled on the first settlement and never re-signals', () => {
    const transceiver = new Transceiver(new Kernel(), 'settle-once');

    const control = {
      transceiverId: 'settle-once',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    transceiver._settle(INLINE, 'first', control);
    expect(control.signalled).toBe(true);

    transceiver._settle(ERROR, new Error('late failure'), control);
    transceiver._settle(ASYNC, 'late value', control);
    transceiver._settle(INTERCEPT, 'late halt', control);

    expect(control.signal.resolve).toHaveBeenCalledTimes(1);
    expect(control.signal.resolve).toHaveBeenCalledWith('first');
    expect(control.signal.reject).not.toHaveBeenCalled();

    const rejectControl = {
      transceiverId: 'settle-once',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    transceiver._settle(ERROR, new Error('nope'), rejectControl);
    expect(rejectControl.signalled).toBe(true);
    expect(rejectControl.signal.reject).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'nope' }),
    );
    transceiver._settle(INLINE, 'late', rejectControl);
    expect(rejectControl.signal.resolve).not.toHaveBeenCalled();
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
    const CHAIN_LINK = { t: 'asynclink', a: 'follow', o: 'jest' };
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    transceiver.addAsyncHandler(
      TARGET,
      () => new AppCtx(CHAIN_LINK.t, CHAIN_LINK.a, CHAIN_LINK.o, DATA),
    );
    transceiver.addInlineHandler(CHAIN_LINK, () => 'async chained');

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

  it('dispatches signal handlers before main-network handlers for the same hop', async () => {
    const kernel = new Kernel();
    const transceiver = new Transceiver(kernel, 'signal-order');
    const order = [];
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    kernel.addInlineHandler(TARGET, () => {
      order.push('main');
    });
    transceiver.addInlineHandler(TARGET, () => {
      order.push('signal');
      return 'ordered';
    });

    await expect(transceiver.setCtx(SOURCE, DATA)).resolves.toBe('ordered');
    await tick();

    // the signals dispatch of a hop starts before the main dispatch of the
    // same hop, and each ran exactly once
    expect(order).toEqual(['signal', 'main']);
  });

  it('enters through a wrapped Channel and resolves from channel-mirrored signal dispatches', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'transceiver-channel');
    const transceiver = new Transceiver(channel, 'via-channel');
    // entry goes through the Channel surface; the mirror sits on the SHARED network
    expect(transceiver._surface).toBe(channel);
    expect(transceiver._network).toBe(kernel._network);

    const channelMirrored = jest.fn();
    channel.addInlineHandler(TARGET, channelMirrored);
    kernel.addInlineHandler(
      SOURCE,
      () => new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA),
    );
    transceiver.addInlineHandler(TARGET, () => 'channel signal');

    await expect(transceiver.setCtx(SOURCE, DATA)).resolves.toBe(
      'channel signal',
    );
    await tick();

    // entering through the Channel kept channel affinity on the cascade:
    // the channel's own handlers mirrored the chained hop too
    expect(channelMirrored).toHaveBeenCalledTimes(1);
    expect(channelMirrored).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
  });

  it('mirrors matching cascades onto the signals network with the hop forward', () => {
    const network = mockNetwork();
    const transceiver = new Transceiver({ _network: network }, 'mirroring');
    const innerEnter = jest.spyOn(transceiver._signals, 'enter');
    expect(network.decorate).toHaveBeenCalledTimes(1);
    const { onForward } = network.decorate.mock.calls[0][0];
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    const forward = jest.fn();

    onForward(
      appCtx,
      { cascade: { transceiverId: 'someone-else' } },
      {
        forward,
      },
    );
    expect(innerEnter).not.toHaveBeenCalled();

    const cascade = {
      transceiverId: 'mirroring',
      signal: { resolve: jest.fn(), reject: jest.fn() },
    };
    onForward(appCtx, { cascade, hop: {}, chain: {} }, { forward });
    expect(innerEnter).toHaveBeenCalledTimes(1);
    const [mirroredAc, opts] = innerEnter.mock.calls[0];
    expect(mirroredAc).toBe(appCtx);
    // the SAME cascade continues, and chains from signal handlers route
    // through the main network's hop engine
    expect(opts.cascade).toBe(cascade);
    expect(opts.forward).toBe(forward);
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

  it('scopes addSignalHandler to its trigram and settles through the signals network', async () => {
    const transceiver = new Transceiver(new Kernel(), 'signal-handler-scope');
    const targetHandler = jest.fn(() => 'target-result');
    transceiver.addSignalHandler(TARGET, targetHandler);

    const fire = (trigram) => {
      const signal = { resolve: jest.fn(), reject: jest.fn() };
      transceiver._signals.enter(
        new AppCtx(trigram.t, trigram.a, trigram.o, DATA),
        {
          cascade: {
            transceiverId: transceiver._transceiverId,
            signal,
          },
        },
      );
      return signal;
    };

    const missed = fire(SOURCE);
    await tick();
    expect(targetHandler).not.toHaveBeenCalled();
    expect(missed.resolve).not.toHaveBeenCalled();

    const hit = fire(TARGET);
    await tick();
    expect(targetHandler).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    // the signals network's settlement decoration resolved the signal
    expect(hit.resolve).toHaveBeenCalledWith('target-result');
    expect(hit.reject).not.toHaveBeenCalled();
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
      transceiver._signals.enter(
        new AppCtx(trigram.t, trigram.a, trigram.o, DATA),
        {
          cascade: {
            transceiverId: transceiver._transceiverId,
            signal: { resolve: jest.fn(), reject: jest.fn() },
          },
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
  // a guard must reject a network missing EITHER envelope capability
  const PRE_ENVELOPE_SHAPES = () => [
    OLD_CORE_NETWORK(),
    { enter: () => {} },
    { decorate: () => {} },
  ];

  it('Channel throws a clear error on a pre-envelope core', () => {
    for (const network of PRE_ENVELOPE_SHAPES()) {
      expect(() => new Channel({ _network: network }, 'old')).toThrow(
        'Channel requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    expect(() => new Channel({}, 'old')).toThrow(/envelope support/);
  });

  it('Source throws a clear error on a pre-envelope core', () => {
    for (const network of PRE_ENVELOPE_SHAPES()) {
      expect(() => new Source({ _network: network }, jest.fn())).toThrow(
        'Source requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
  });

  it('Relay throws a clear error on a pre-envelope core', () => {
    for (const network of PRE_ENVELOPE_SHAPES()) {
      expect(
        () => new Relay({ _network: network }, jest.fn(), 'r', jest.fn()),
      ).toThrow(
        'Relay requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
  });

  it('Transponder throws a clear error on a pre-envelope core', () => {
    for (const network of PRE_ENVELOPE_SHAPES()) {
      expect(() => new Transponder({ _network: network }, 'old')).toThrow(
        'Transponder requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    expect(() => new Transponder({})).toThrow(/envelope support/);
  });

  it('Transceiver throws a clear error on a pre-envelope core', () => {
    for (const network of PRE_ENVELOPE_SHAPES()) {
      expect(() => new Transceiver({ _network: network })).toThrow(
        'Transceiver requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    expect(() => new Transceiver({})).toThrow(/envelope support/);
  });
});

describe('Channel entry trigram normalization', () => {
  it('builds the entered AppCtx from short or long trigram keys', () => {
    const network = mockNetwork();
    const channel = new Channel({ _network: network }, 'normalizing');

    channel.setCtx({ t: 'Short', a: 'Key', o: 'Form' }, DATA);
    channel.setCtx({ term: 'Long', action: 'Key', orient: 'Form' }, DATA);

    const [shortAc] = network.enter.mock.calls[0];
    expect(shortAc.unwrapCtx()).toEqual({ t: 'Short', a: 'Key', o: 'Form' });
    const [longAc] = network.enter.mock.calls[1];
    expect(longAc.unwrapCtx()).toEqual({ t: 'Long', a: 'Key', o: 'Form' });
  });
});

describe('Source under hop-marked dispatches', () => {
  it('emits network entries and suppresses only its own hop marker', () => {
    const kernel = new Kernel();
    const toSrc = jest.fn();
    const source = new Source(kernel, toSrc, 'hop-source');
    const enter = (hop) =>
      kernel._network.enter(
        new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA),
        hop ? { hop } : undefined,
      );

    // an entry without a source marker: emitted
    enter();
    expect(toSrc).toHaveBeenCalledTimes(1);
    expect(toSrc).toHaveBeenCalledWith(SOURCE, DATA);

    // an entry carrying this source's own hop marker: suppressed
    enter({ source: 'hop-source' });
    expect(toSrc).toHaveBeenCalledTimes(1);

    // a different source name on the hop: emitted
    enter({ source: 'someone-else' });
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

  it('resolves through a wrapped Channel from the first mirrored descendant, not the entry', async () => {
    const kernel = new Kernel();
    const channel = new Channel(kernel, 'transponder-channel');
    const transponder = new Transponder(channel, 'via-channel', 0);
    // the wrapped surface is the Channel itself: entries keep channel
    // affinity and the resolver decorates the Channel's private network
    expect(transponder._network).toBe(channel);

    let chainedAc = null;
    kernel.addInlineHandler(
      SOURCE,
      () => (chainedAc = new AppCtx(TARGET.t, TARGET.a, TARGET.o, DATA)),
    );

    const settled = await transponder.setCtx(SOURCE, DATA);
    // resolved with the first CHANNEL-MIRRORED dispatch (the chained hop),
    // not with the entry AppCtx dispatched on the main network
    expect(settled).toBe(chainedAc);
    expect(settled.unwrapCtx()).toEqual(TARGET);
  });
});

describe('Channel.bridgeFrom filtering', () => {
  it('returns a safe no-op when bridging from an invalid or missing TAO', () => {
    const channel = new Channel(new Kernel(), 'noop-bridge');

    const stopInvalid = channel.bridgeFrom({}, SOURCE);
    expect(stopInvalid).toBeInstanceOf(Function);
    expect(stopInvalid()).toBeUndefined();

    const stopMissing = channel.bridgeFrom(null, SOURCE);
    expect(stopMissing).toBeInstanceOf(Function);
    expect(stopMissing()).toBeUndefined();
  });

  it('no-ops seives aimed at destinations without a channel network', () => {
    const source = new Kernel();

    expect(seive('no-destination', source, null, SOURCE)()).toBeUndefined();
    expect(
      seive('channel-less', source, { _network: source._network }, SOURCE)(),
    ).toBeUndefined();
  });

  it('bridges every signal when no trigrams are given', () => {
    const source = new Kernel();
    const channel = new Channel(new Kernel(), 'bridge-all');
    const received = jest.fn();
    channel.addInlineHandler(TARGET, received);

    const stop = channel.bridgeFrom(source);
    source.setCtx(TARGET, DATA);

    expect(received).toHaveBeenCalledWith(TARGET, { Page: DATA.Page });
    stop();
  });

  it('honors exact matching and flattens trigram arrays', () => {
    const source = new Kernel();
    const channel = new Channel(new Kernel(), 'bridge-exact');
    const received = jest.fn();
    channel.addInlineHandler(SOURCE, received);

    // an exact-matching bridge rejects partial trigrams but takes full ones
    const stopExact = channel.bridgeFrom(source, true, { t: SOURCE.t });
    source.setCtx(SOURCE, DATA);
    expect(received).not.toHaveBeenCalled();
    stopExact();

    const stopFullExact = channel.bridgeFrom(source, true, SOURCE);
    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
    stopFullExact();

    // an array of trigrams is flattened into individual filters
    const stopArray = channel.bridgeFrom(source, [SOURCE]);
    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledTimes(2);
    stopArray();
  });

  it('seives into a real Channel without a predicate on trigram match alone', async () => {
    const source = new Kernel();
    const channel = new Channel(new Kernel(), 'predicate-less');
    const received = jest.fn();
    channel.addInlineHandler(SOURCE, received);

    const stop = seive('predicate-less', source, channel, SOURCE);
    source.setCtx(TARGET, DATA);
    await tick();
    expect(received).not.toHaveBeenCalled();

    source.setCtx(SOURCE, DATA);
    await tick();
    expect(received).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);

    stop();
    source.setCtx(SOURCE, DATA);
    await tick();
    expect(received).toHaveBeenCalledTimes(1);
  });

  it('applies the AppCtx guards inside bridged trigram filters', () => {
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o);

    const defaultFilter = trigramFilter();
    expect(defaultFilter(appCtx)).toBe(true);
    expect(defaultFilter(SOURCE)).toBe(false);

    expect(trigramFilter(SOURCE)(appCtx)).toBe(true);
    expect(trigramFilter(SOURCE)({ ...SOURCE })).toBe(false);
  });
});
