import Kernel from '../src/Kernel';
import Network from '../src/Network';
import AppCtx from '../src/AppCtx';
import { INTERCEPT, ASYNC, INLINE, ERROR } from '../src/constants';

const TERM = 'envelope';
const ACTION = 'test';
const ORIENT = 'jest';
const NEXT_ACTION = 'chained';
const THIRD_ACTION = 'settled';

const TRIGRAM = { t: TERM, a: ACTION, o: ORIENT };
const NEXT_TRIGRAM = { t: TERM, a: NEXT_ACTION, o: ORIENT };

let TAO = null;
function initTAO() {
  TAO = new Kernel();
}
function clearTAO() {
  TAO = null;
}

beforeEach(initTAO);
afterEach(clearTAO);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Network.decorate validates decorations', () => {
  it('should require a spec object with at least one capability', () => {
    // Assemble
    const network = new Network();
    // Act
    // Assert
    expect(() => network.decorate()).toThrow(/decoration spec/);
    expect(() => network.decorate(null)).toThrow(/decoration spec/);
    expect(() => network.decorate(42)).toThrow(/decoration spec/);
    expect(() => network.decorate({})).toThrow(/at least one capability/);
    expect(() => network.decorate({ onDispatch: 42 })).toThrow(
      /onDispatch must be a function/,
    );
    expect(() => network.decorate({ onForward: 42 })).toThrow(
      /onForward must be a function/,
    );
    expect(() => network.decorate({ onReturn: 42 })).toThrow(
      /onReturn must be a function/,
    );
    expect(() => network.decorate({ onProceed: 'x' })).toThrow(
      'decoration onProceed must be a function',
    );
    expect(() => network.decorate({ chain: { key: 'x' } })).toThrow(
      /chain must be/,
    );
    expect(() => network.decorate({ chain: null })).toThrow(/chain must be/);
    expect(() =>
      network.decorate({ chain: { key: 42, next: () => ({}) } }),
    ).toThrow(/chain must be/);
  });

  it('should accept a decoration with only an onProceed capability', () => {
    // Assemble
    const network = new Network();
    // Act
    let dispose = null;
    // Assert — onProceed alone satisfies the at-least-one-capability check
    expect(() => {
      dispose = network.decorate({ onProceed: jest.fn() });
    }).not.toThrow();
    expect(typeof dispose).toBe('function');
  });

  it('should not release another decoration chain key on double dispose', () => {
    // Assemble
    const network = new Network();
    const first = network.decorate({
      chain: { key: 'shared', next: () => ({}) },
    });
    first();
    network.decorate({ chain: { key: 'shared', next: () => ({}) } });
    // Act — disposing the first again must not free the second's key
    first();
    // Assert
    expect(() =>
      network.decorate({ chain: { key: 'shared', next: () => ({}) } }),
    ).toThrow(/already reduced/);
  });

  it('should reject a duplicate chain key and release it on dispose', () => {
    // Assemble
    const network = new Network();
    const reducer = { key: 'trace', next: () => ({}) };
    // Act
    const dispose = network.decorate({ chain: reducer });
    // Assert
    expect(() => network.decorate({ chain: { ...reducer } })).toThrow(
      /already reduced/,
    );
    dispose();
    expect(() =>
      network.decorate({ chain: { key: 'trace', next: () => ({}) } }),
    ).not.toThrow();
  });
});

describe('Network.enter dispatches through the hop engine', () => {
  it('should require an AppCtx', () => {
    // Assemble
    // Act
    // Assert
    expect(() => TAO._network.enter({ t: TERM })).toThrow(/not an instance/);
  });

  it('should dispatch handlers exactly once per signal', async () => {
    // Assemble
    const handler = jest.fn();
    TAO.addInlineHandler(TRIGRAM, handler);
    // Act
    TAO.setCtx(TRIGRAM, { [TERM]: { id: 1 } });
    await flush();
    // Assert
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining(TRIGRAM), {
      [TERM]: { id: 1 },
    });
  });

  it('should share one cascade object across every hop', async () => {
    // Assemble
    const seen = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope) => seen.push(envelope.cascade),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(
      NEXT_TRIGRAM,
      () => new AppCtx(TERM, THIRD_ACTION, ORIENT),
    );
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(seen).toHaveLength(3);
    expect(seen[1]).toBe(seen[0]);
    expect(seen[2]).toBe(seen[0]);
  });

  it('should reset hop state on every hop after the entry', async () => {
    // Assemble
    const hops = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope) => hops.push(envelope.hop),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    // Act
    TAO._network.enter(new AppCtx(TERM, ACTION, ORIENT), {
      hop: { source: 'entry-only' },
    });
    await flush();
    // Assert — entry values never leak to the next hop; the chained hop
    // carries only the producing phase (§4 0.20)
    expect(hops).toHaveLength(2);
    expect(hops[0]).toStrictEqual({ source: 'entry-only' });
    expect(hops[1]).toStrictEqual({ via: 'Inline' });
  });

  it('should derive chain state per hop through registered reducers', async () => {
    // Assemble
    const network = TAO._network;
    network.decorate({
      chain: {
        key: 'depth',
        next: (prev) => (typeof prev === 'undefined' ? 0 : prev + 1),
      },
    });
    const depths = [];
    network.decorate({
      onDispatch: (ac, envelope) => depths.push(envelope.chain.depth),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(
      NEXT_TRIGRAM,
      () => new AppCtx(TERM, THIRD_ACTION, ORIENT),
    );
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(depths).toEqual([0, 1, 2]);
  });

  it('should continue a prior chain provided at entry', () => {
    // Assemble
    const network = TAO._network;
    network.decorate({
      chain: {
        key: 'depth',
        next: (prev) => (prev === undefined ? 0 : prev + 1),
      },
    });
    const depths = [];
    network.decorate({
      onDispatch: (ac, envelope) => depths.push(envelope.chain.depth),
    });
    // Act — continue as though a remote process was already at depth 4
    network.enter(new AppCtx(TERM, ACTION, ORIENT), { chain: { depth: 4 } });
    // Assert
    expect(depths).toEqual([5]);
  });

  it('should drop chained wildcard AppCons per the network wildcard policy', async () => {
    // Assemble
    const wildKernel = new Kernel(true);
    const plainSeen = [];
    const wildSeen = [];
    const plainWildcardHandler = jest.fn();
    TAO._network.decorate({ onDispatch: (ac) => plainSeen.push(ac.key) });
    wildKernel._network.decorate({ onDispatch: (ac) => wildSeen.push(ac.key) });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM));
    // a wildcard ACH exists on the plain kernel, so a dispatched wildcard
    // chain WOULD have somewhere to land — the policy must still drop it
    TAO.addInlineHandler({ t: TERM }, plainWildcardHandler);
    wildKernel.addInlineHandler(TRIGRAM, () => new AppCtx(TERM));
    wildKernel.addInlineHandler({ t: TERM }, jest.fn());
    // Act
    TAO.setCtx(TRIGRAM, {});
    wildKernel.setCtx(TRIGRAM, {});
    await flush();
    // Assert — plain kernel drops the wildcard chain, wildcard kernel dispatches it
    expect(plainSeen).toEqual([`${TERM}|${ACTION}|${ORIENT}`]);
    // the wildcard handler fired for the concrete entry only, never a wildcard dispatch
    expect(plainWildcardHandler).toHaveBeenCalledTimes(1);
    expect(wildSeen).toContain(`${TERM}|*|*`);
  });

  it('should silently ignore wildcard entries with no matching wildcard registration', () => {
    // Assemble
    const wildKernel = new Kernel(true);
    const seen = [];
    wildKernel._network.decorate({ onDispatch: (ac) => seen.push(ac.key) });
    // Act
    // Assert — no auto-added handler, no dispatch, no throw
    expect(() => wildKernel.setCtx({ t: TERM }, {})).not.toThrow();
    expect(seen).toEqual([]);
    expect(wildKernel._network._handlers.has(`${TERM}|*|*`)).toBe(false);
  });

  it('should drop wildcard chains on a bare Network by default', async () => {
    // Assemble — a raw Network (no Kernel) defaults canSetWildcard to false
    const network = new Network();
    const seen = [];
    network.decorate({ onDispatch: (ac) => seen.push(ac.key) });
    network.addInlineHandler(TRIGRAM, () => new AppCtx(TERM));
    network.addInlineHandler({ t: TERM }, jest.fn());
    // Act
    network.enter(new AppCtx(TERM, ACTION, ORIENT));
    await flush();
    // Assert
    expect(seen).toEqual([`${TERM}|${ACTION}|${ORIENT}`]);
  });
});

describe('Network decorations observe and mirror', () => {
  it('should call onForward before dispatching the chained AppCon', async () => {
    // Assemble
    const order = [];
    TAO._network.decorate({
      onDispatch: (ac) => order.push(`dispatch:${ac.a}`),
      onForward: (nextAc) => order.push(`forward:${nextAc.a}`),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(order).toEqual([
      `dispatch:${ACTION}`,
      `forward:${NEXT_ACTION}`,
      `dispatch:${NEXT_ACTION}`,
    ]);
  });

  it('should pass the causing envelope to onForward', async () => {
    // Assemble
    const forwards = [];
    TAO._network.decorate({
      onForward: (nextAc, envelope, meta) =>
        forwards.push({ nextAc, envelope, meta }),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    const [forwarded] = forwards;
    expect(forwarded.nextAc.a).toBe(NEXT_ACTION);
    expect(forwarded.meta.from.cascade).toBe(forwarded.envelope.cascade);
    expect(forwarded.meta.from.chain).not.toBe(forwarded.envelope.chain);
    expect(typeof forwarded.meta.forward).toBe('function');
  });

  it('should never let a throwing decoration break dispatch', async () => {
    // Assemble
    const handler = jest.fn();
    TAO._network.decorate({
      onDispatch: () => {
        throw new Error('observer boom');
      },
      onForward: () => {
        throw new Error('forward boom');
      },
      chain: {
        key: 'broken',
        next: () => {
          throw new Error('reducer boom');
        },
      },
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(NEXT_TRIGRAM, handler);
    // Act
    // Assert
    expect(() => TAO.setCtx(TRIGRAM, {})).not.toThrow();
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should stop observing after dispose', () => {
    // Assemble
    const seen = [];
    const dispose = TAO._network.decorate({
      onDispatch: (ac) => seen.push(ac.a),
    });
    // Act
    TAO.setCtx(TRIGRAM, {});
    dispose();
    TAO.setCtx(TRIGRAM, {});
    // Assert
    expect(seen).toEqual([ACTION]);
  });
});

describe('Cascade continuation forwards (network composition)', () => {
  it("should continue this hop's cascade through the onDispatch forward", async () => {
    // Assemble
    const cascades = [];
    const depths = [];
    const hops = [];
    const chained = new AppCtx(TERM, NEXT_ACTION, ORIENT);
    const chainedHandler = jest.fn();
    TAO._network.decorate({
      chain: {
        key: 'depth',
        next: (prev) => (typeof prev === 'undefined' ? 0 : prev + 1),
      },
    });
    TAO._network.decorate({
      onDispatch: (ac, envelope, handler, forward) => {
        cascades.push(envelope.cascade);
        depths.push(envelope.chain.depth);
        hops.push(envelope.hop);
        if (ac.a === ACTION) {
          forward(chained);
        }
      },
    });
    TAO.addInlineHandler(NEXT_TRIGRAM, chainedHandler);
    // Act
    TAO._network.enter(new AppCtx(TERM, ACTION, ORIENT), {
      hop: { source: 'entry' },
    });
    await flush();
    // Assert — the chained AC dispatched with the SAME cascade, a reduced
    // chain, and a reset hop
    expect(cascades).toHaveLength(2);
    expect(cascades[1]).toBe(cascades[0]);
    expect(depths).toEqual([0, 1]);
    expect(hops[0]).toEqual({ source: 'entry' });
    expect(hops[1]).toEqual({});
    expect(chainedHandler).toHaveBeenCalledTimes(1);
  });

  it('should continue the cascade from the chained hop through onForward meta.forward', async () => {
    // Assemble
    const cascades = [];
    const depths = [];
    const metas = [];
    const third = new AppCtx(TERM, THIRD_ACTION, ORIENT);
    const thirdHandler = jest.fn();
    TAO._network.decorate({
      chain: {
        key: 'depth',
        next: (prev) => (typeof prev === 'undefined' ? 0 : prev + 1),
      },
    });
    TAO._network.decorate({
      onDispatch: (ac, envelope) => {
        cascades.push(envelope.cascade);
        depths.push(envelope.chain.depth);
      },
      onForward: (nextAc, envelope, meta) => metas.push(meta),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler({ t: TERM, a: THIRD_ACTION, o: ORIENT }, thirdHandler);
    // Act — run the main cascade first
    TAO.setCtx(TRIGRAM, {});
    await flush();
    expect(depths).toEqual([0, 1]);
    // Act — a mirror continues the cascade from the chained hop, as a
    // channel-attached handler chain would
    metas[0].forward(third);
    await flush();
    // Assert — the continued AC dispatched with the SAME cascade and the
    // chain reduced from the chained hop
    expect(cascades).toHaveLength(3);
    expect(cascades[1]).toBe(cascades[0]);
    expect(cascades[2]).toBe(cascades[0]);
    expect(depths).toEqual([0, 1, 2]);
    expect(thirdHandler).toHaveBeenCalledTimes(1);
  });

  it("should route handler-returned AppCons to enter's forward override", async () => {
    // Assemble
    const override = jest.fn();
    const chained = new AppCtx(TERM, NEXT_ACTION, ORIENT);
    const chainedHandler = jest.fn();
    const seen = [];
    let entryEnvelope = null;
    let dispatchForward = null;
    TAO._network.decorate({
      onDispatch: (ac, envelope, handler, forward) => {
        seen.push(ac.key);
        entryEnvelope = envelope;
        dispatchForward = forward;
      },
    });
    TAO.addInlineHandler(TRIGRAM, () => chained);
    TAO.addInlineHandler(NEXT_TRIGRAM, chainedHandler);
    // Act
    TAO._network.enter(new AppCtx(TERM, ACTION, ORIENT), { forward: override });
    await flush();
    // Assert — the override received the chained AppCtx with the cascade and
    // the producing phase as its third argument (§4 0.20)
    expect(override).toHaveBeenCalledTimes(1);
    expect(override.mock.calls[0][0]).toBe(chained);
    expect(override.mock.calls[0][1]).toBe(entryEnvelope.cascade);
    expect(override.mock.calls[0][2]).toBe('Inline');
    // ...it is also this dispatch's forward as seen by decorations...
    expect(dispatchForward).toBe(override);
    // ...and the chained AppCtx was NOT dispatched on this network
    expect(chainedHandler).not.toHaveBeenCalled();
    expect(seen).toEqual([`${TERM}|${ACTION}|${ORIENT}`]);
  });

  it('should ignore a non-function forward option and forward normally', async () => {
    // Assemble
    const chainedHandler = jest.fn();
    const forwards = [];
    TAO._network.decorate({ onForward: (nextAc) => forwards.push(nextAc.a) });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(NEXT_TRIGRAM, chainedHandler);
    // Act
    TAO._network.enter(new AppCtx(TERM, ACTION, ORIENT), {
      forward: 'not-a-function',
    });
    await flush();
    // Assert — normal core forwarding still happened
    expect(forwards).toEqual([NEXT_ACTION]);
    expect(chainedHandler).toHaveBeenCalledTimes(1);
  });
});

describe('hop.via — the producing phase (0.20)', () => {
  it('should keep the caller-supplied entry hop verbatim with no via', () => {
    // Assemble
    const hops = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope) => hops.push(envelope.hop),
    });
    const hop = { source: 'x' };
    // Act
    TAO._network.enter(new AppCtx(TERM, ACTION, ORIENT), { hop });
    // Assert — the very object given, and exactly its keys (never a via)
    expect(hops).toHaveLength(1);
    expect(hops[0]).toBe(hop);
    expect(hops[0]).toStrictEqual({ source: 'x' });
  });

  it('should stamp hop.via on a chain continued through meta.forward with a via', async () => {
    // Assemble
    const hops = [];
    const metas = [];
    const third = new AppCtx(TERM, THIRD_ACTION, ORIENT);
    const thirdHandler = jest.fn();
    TAO._network.decorate({
      onDispatch: (ac, envelope) => hops.push({ a: ac.a, hop: envelope.hop }),
      onForward: (nextAc, envelope, meta) => metas.push(meta),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler({ t: TERM, a: THIRD_ACTION, o: ORIENT }, thirdHandler);
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Act — an adapter continues the cascade from the chained hop, reporting
    // the phase that produced the AppCon as the continuation's third argument
    metas[0].forward(third, null, 'Inline');
    await flush();
    // Assert — the continued dispatch carries exactly { via: 'Inline' }
    expect(hops).toHaveLength(3);
    expect(hops[2]).toStrictEqual({ a: THIRD_ACTION, hop: { via: 'Inline' } });
    expect(thirdHandler).toHaveBeenCalledTimes(1);
  });

  it('should reset the hop with no via key when the continuation gets no via', async () => {
    // Assemble
    const hops = [];
    const metas = [];
    const third = new AppCtx(TERM, THIRD_ACTION, ORIENT);
    TAO._network.decorate({
      onDispatch: (ac, envelope) => hops.push({ a: ac.a, hop: envelope.hop }),
      onForward: (nextAc, envelope, meta) => metas.push(meta),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Act
    metas[0].forward(third);
    await flush();
    // Assert — strictly {}: no via key may be present (not even undefined)
    expect(hops).toHaveLength(3);
    expect(hops[2]).toStrictEqual({ a: THIRD_ACTION, hop: {} });
  });

  // Chained hops produced by the three phase sites carry { via: <phase> }
  // through the core hop engine (ENVELOPE-SPEC.md §4, 0.20)
  it('should dispatch an inline-chained AppCtx with hop { via: "Inline" }', async () => {
    // Assemble
    const hops = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope) => hops.push({ a: ac.a, hop: envelope.hop }),
    });
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(hops).toHaveLength(2);
    expect(hops[1]).toStrictEqual({ a: NEXT_ACTION, hop: { via: 'Inline' } });
  });

  it('should dispatch an async-chained AppCtx with hop { via: "Async" }', async () => {
    // Assemble
    const hops = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope) => hops.push({ a: ac.a, hop: envelope.hop }),
    });
    TAO.addAsyncHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(hops).toHaveLength(2);
    expect(hops[1]).toStrictEqual({ a: NEXT_ACTION, hop: { via: 'Async' } });
  });

  it('should dispatch an intercept divert with hop { via: "Intercept" }', async () => {
    // Assemble
    const hops = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope) => hops.push({ a: ac.a, hop: envelope.hop }),
    });
    TAO.addInterceptHandler(
      TRIGRAM,
      () => new AppCtx(TERM, NEXT_ACTION, ORIENT),
    );
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(hops).toHaveLength(2);
    expect(hops[1]).toStrictEqual({
      a: NEXT_ACTION,
      hop: { via: 'Intercept' },
    });
  });

  it('should thread via as the 3rd argument of the onDispatch forward', async () => {
    // Assemble
    const hops = [];
    const chained = new AppCtx(TERM, NEXT_ACTION, ORIENT);
    TAO._network.decorate({
      onDispatch: (ac, envelope, handler, forward) => {
        hops.push({ a: ac.a, hop: envelope.hop });
        if (ac.a === ACTION) {
          forward(chained, null, 'Inline');
        }
      },
    });
    // Act
    TAO._network.enter(new AppCtx(TERM, ACTION, ORIENT));
    await flush();
    // Assert
    expect(hops).toContainEqual({ a: NEXT_ACTION, hop: { via: 'Inline' } });
  });
});

describe('Network.mirror dispatches the observed hop verbatim (0.20)', () => {
  it('should require an AppCtx and the observed envelope', () => {
    // Assemble
    const network = new Network();
    const ac = new AppCtx(TERM, ACTION, ORIENT);
    // Act
    // Assert
    expect(() => network.mirror({ t: TERM })).toThrow(
      `'appCtx' not an instance of AppCtx`,
    );
    expect(() => network.mirror(ac)).toThrow(
      'mirror requires the observed envelope',
    );
    expect(() => network.mirror(ac, null)).toThrow(
      'mirror requires the observed envelope',
    );
    expect(() => network.mirror(ac, 'observed')).toThrow(
      'mirror requires the observed envelope',
    );
  });

  it('should dispatch handlers with the exact envelope object observed', async () => {
    // Assemble — the mirrored hop is the SAME hop on a second registry: same
    // cascade reference, same hop (source AND via), same chain — verbatim
    const network = new Network();
    const handler = jest.fn();
    const seen = [];
    network.decorate({
      onDispatch: (ac, envelope) => seen.push({ ac, envelope }),
    });
    network.addInlineHandler(TRIGRAM, handler);
    const ac = new AppCtx(TERM, ACTION, ORIENT, { [TERM]: { id: 5 } });
    const envelope = {
      cascade: { transceiverId: 'abc' },
      hop: { source: 'remote', via: 'Async' },
      chain: { trace: { id: 1 } },
    };
    // Act
    network.mirror(ac, envelope);
    await flush();
    // Assert — identity, not equality: no re-derivation of any envelope part
    expect(seen).toHaveLength(1);
    expect(seen[0].ac).toBe(ac);
    expect(seen[0].envelope).toBe(envelope);
    expect(seen[0].envelope.cascade).toBe(envelope.cascade);
    expect(seen[0].envelope.hop).toBe(envelope.hop);
    expect(seen[0].envelope.chain).toBe(envelope.chain);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      { t: TERM, a: ACTION, o: ORIENT },
      { [TERM]: { id: 5 } },
    );
  });

  it('should not run chain reducers for the mirrored hop', async () => {
    // Assemble
    const network = new Network();
    const next = jest.fn(() => ({}));
    network.decorate({ chain: { key: 'trace', next } });
    const chains = [];
    network.decorate({
      onDispatch: (ac, envelope) => chains.push(envelope.chain),
    });
    network.addInlineHandler(TRIGRAM, jest.fn());
    const chain = { trace: { hops: 3 } };
    // Act
    network.mirror(new AppCtx(TERM, ACTION, ORIENT), {
      cascade: {},
      hop: {},
      chain,
    });
    await flush();
    // Assert — the observed chain passes through untouched
    expect(next).not.toHaveBeenCalled();
    expect(chains).toHaveLength(1);
    expect(chains[0]).toBe(chain);
  });

  it('should route chained AppCons to the provided forward and never dispatch them here', async () => {
    // Assemble
    const network = new Network();
    const forward = jest.fn();
    const chained = new AppCtx(TERM, NEXT_ACTION, ORIENT);
    const chainedHandler = jest.fn();
    const seen = [];
    let dispatchForward = null;
    network.decorate({
      onDispatch: (ac, envelope, handler, fwd) => {
        seen.push(ac.key);
        dispatchForward = fwd;
      },
    });
    network.addInlineHandler(TRIGRAM, () => chained);
    network.addInlineHandler(NEXT_TRIGRAM, chainedHandler);
    const envelope = { cascade: { channelId: 'ch1' }, hop: {}, chain: {} };
    // Act
    network.mirror(new AppCtx(TERM, ACTION, ORIENT), envelope, forward);
    await flush();
    // Assert — the chained AppCtx went to the provided continuation with the
    // observed cascade and the producing phase...
    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward.mock.calls[0][0]).toBe(chained);
    expect(forward.mock.calls[0][1]).toBe(envelope.cascade);
    expect(forward.mock.calls[0][2]).toBe('Inline');
    // ...the provided forward is also this dispatch's forward as decorations
    // see it...
    expect(dispatchForward).toBe(forward);
    // ...and the mirroring network never dispatched the chained AppCtx
    expect(chainedHandler).not.toHaveBeenCalled();
    expect(seen).toEqual([`${TERM}|${ACTION}|${ORIENT}`]);
  });

  it('should continue chains on its own hop engine when no forward is given', async () => {
    // Assemble
    const network = new Network();
    const seen = [];
    network.decorate({
      chain: {
        key: 'depth',
        next: (prev) => (typeof prev === 'undefined' ? 0 : prev + 1),
      },
    });
    network.decorate({
      onDispatch: (ac, envelope) => seen.push({ a: ac.a, envelope }),
    });
    const chainedHandler = jest.fn();
    network.addInlineHandler(
      TRIGRAM,
      () => new AppCtx(TERM, NEXT_ACTION, ORIENT),
    );
    network.addInlineHandler(NEXT_TRIGRAM, chainedHandler);
    const envelope = {
      cascade: { channelId: 'ch1' },
      hop: { source: 'remote' },
      chain: { depth: 7 },
    };
    // Act
    network.mirror(new AppCtx(TERM, ACTION, ORIENT), envelope);
    await flush();
    // Assert — the mirrored hop is verbatim; the chained hop continues FROM
    // the observed envelope: same cascade reference, chain reduced from the
    // observed chain
    expect(seen).toHaveLength(2);
    expect(seen[0].envelope).toBe(envelope);
    expect(seen[1].a).toBe(NEXT_ACTION);
    expect(seen[1].envelope.cascade).toBe(envelope.cascade);
    expect(seen[1].envelope.chain).toStrictEqual({ depth: 8 });
    expect(seen[1].envelope.hop).toStrictEqual({ via: 'Inline' });
    expect(chainedHandler).toHaveBeenCalledTimes(1);
  });

  it('should ignore a non-function forward and fall back to its own hop engine', async () => {
    // Assemble
    const network = new Network();
    const chainedHandler = jest.fn();
    network.addInlineHandler(
      TRIGRAM,
      () => new AppCtx(TERM, NEXT_ACTION, ORIENT),
    );
    network.addInlineHandler(NEXT_TRIGRAM, chainedHandler);
    // Act
    network.mirror(
      new AppCtx(TERM, ACTION, ORIENT),
      {
        cascade: {},
        hop: {},
        chain: {},
      },
      'not-a-function',
    );
    await flush();
    // Assert — the chain dispatched on the mirroring network itself
    expect(chainedHandler).toHaveBeenCalledTimes(1);
  });
});

describe('Proceed hook (onProceed) — 0.20', () => {
  it('should fire with (ac, envelope) exactly once per dispatch when no intercepts are registered', async () => {
    // Assemble
    const proceeds = [];
    const envelopes = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope) => envelopes.push(envelope),
      onProceed: (ac, envelope) => proceeds.push({ ac, envelope }),
    });
    const handler = jest.fn();
    TAO.addInlineHandler(TRIGRAM, handler);
    const entry = new AppCtx(TERM, ACTION, ORIENT);
    // Act
    TAO._network.enter(entry);
    await flush();
    // Assert — exactly once, with the dispatched AppCtx and ITS envelope
    expect(proceeds).toHaveLength(1);
    expect(proceeds[0].ac).toBe(entry);
    expect(proceeds[0].envelope).toBe(envelopes[0]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should fire when intercepts run but none halt', async () => {
    // Assemble
    const onProceed = jest.fn();
    TAO._network.decorate({ onProceed });
    const intercept = jest.fn(() => undefined);
    TAO.addInterceptHandler(TRIGRAM, intercept);
    TAO.addInlineHandler(TRIGRAM, jest.fn());
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(intercept).toHaveBeenCalledTimes(1);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('should not fire when an intercept halts with a truthy non-AppCtx return', async () => {
    // Assemble
    const onProceed = jest.fn();
    TAO._network.decorate({ onProceed });
    const halted = jest.fn();
    TAO.addInterceptHandler(TRIGRAM, () => 'halted-because');
    TAO.addInlineHandler(TRIGRAM, halted);
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert — the veto suppresses the proceed signal entirely
    expect(onProceed).not.toHaveBeenCalled();
    expect(halted).not.toHaveBeenCalled();
  });

  it('should not fire for a diverted dispatch but fire for the divert chain itself', async () => {
    // Assemble
    const proceeds = [];
    TAO._network.decorate({ onProceed: (ac) => proceeds.push(ac.a) });
    TAO.addInterceptHandler(
      TRIGRAM,
      () => new AppCtx(TERM, NEXT_ACTION, ORIENT),
    );
    const divertedTo = jest.fn();
    TAO.addInlineHandler(NEXT_TRIGRAM, divertedTo);
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert — exactly one proceed: the diverted-to dispatch, never the
    // intercepted entry
    expect(divertedTo).toHaveBeenCalledTimes(1);
    expect(proceeds).toEqual([NEXT_ACTION]);
  });

  it('should fire before async and inline handlers execute', async () => {
    // Assemble
    const order = [];
    TAO._network.decorate({ onProceed: () => order.push('proceed') });
    TAO.addAsyncHandler(TRIGRAM, () => {
      order.push('async');
    });
    TAO.addInlineHandler(TRIGRAM, () => {
      order.push('inline');
    });
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(order).toEqual(['proceed', 'async', 'inline']);
  });

  it('should fire every onProceed decoration with the same (ac, envelope)', async () => {
    // Assemble
    const first = jest.fn();
    const second = jest.fn();
    TAO._network.decorate({ onProceed: first });
    TAO._network.decorate({ onProceed: second });
    TAO.addInlineHandler(TRIGRAM, jest.fn());
    const entry = new AppCtx(TERM, ACTION, ORIENT);
    // Act
    TAO._network.enter(entry);
    await flush();
    // Assert
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][0]).toBe(entry);
    expect(second.mock.calls[0][0]).toBe(entry);
    expect(second.mock.calls[0][1]).toBe(first.mock.calls[0][1]);
  });

  it('should never let a throwing onProceed break dispatch or later proceeds', async () => {
    // Assemble
    const proceeded = jest.fn();
    TAO._network.decorate({
      onProceed: () => {
        throw new Error('proceed boom');
      },
    });
    TAO._network.decorate({ onProceed: proceeded });
    const handler = jest.fn();
    TAO.addInlineHandler(TRIGRAM, handler);
    // Act
    // Assert
    expect(() => TAO.setCtx(TRIGRAM, {})).not.toThrow();
    await flush();
    expect(proceeded).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should pass hooks with onProceed and without onReturn when only onProceed is decorated', () => {
    // Assemble
    TAO._network.decorate({ onProceed: jest.fn() });
    TAO.addInlineHandler(TRIGRAM, () => {});
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    const handleAppCon = jest.spyOn(ach, 'handleAppCon');
    // Act
    TAO.setCtx(TRIGRAM, {});
    // Assert
    expect(handleAppCon).toHaveBeenCalledTimes(1);
    const hooks = handleAppCon.mock.calls[0][3];
    expect(typeof hooks).toBe('object');
    expect(typeof hooks.onProceed).toBe('function');
    expect(hooks.onReturn).toBeUndefined();
    handleAppCon.mockRestore();
  });

  it('should ignore a non-function onProceed on the hooks object', async () => {
    // Assemble — a malformed hooks object must not be called as the proceed
    // hook
    const handler = jest.fn();
    TAO.addInlineHandler(TRIGRAM, handler);
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    // Act
    // Assert
    await expect(
      ach.handleAppCon(
        new AppCtx(TERM, ACTION, ORIENT),
        () => {},
        {},
        {
          onProceed: 42,
        },
      ),
    ).resolves.not.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('Settlement hook (onReturn)', () => {
  function settleInto(returns) {
    TAO._network.decorate({
      onReturn: (phase, value, ac) => returns.push({ phase, value, a: ac.a }),
    });
  }

  it('should settle a truthy non-AppCtx intercept return and still halt', async () => {
    // Assemble
    const returns = [];
    settleInto(returns);
    const swallowed = jest.fn();
    TAO.addInterceptHandler(TRIGRAM, () => 'halted-because');
    TAO.addInlineHandler(TRIGRAM, swallowed);
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(swallowed).not.toHaveBeenCalled();
    expect(returns).toEqual([
      { phase: INTERCEPT, value: 'halted-because', a: ACTION },
    ]);
  });

  it('should settle non-null non-AppCtx async returns', async () => {
    // Assemble
    const returns = [];
    settleInto(returns);
    TAO.addAsyncHandler(TRIGRAM, async () => ({ result: 42 }));
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(returns).toEqual([
      { phase: ASYNC, value: { result: 42 }, a: ACTION },
    ]);
  });

  it('should settle inline returns after all inline handlers and before chained dispatch', async () => {
    // Assemble
    const order = [];
    TAO._network.decorate({
      onReturn: (phase, value) => order.push(`return:${phase}:${value}`),
      onDispatch: (ac) => order.push(`dispatch:${ac.a}`),
    });
    TAO.addInlineHandler(TRIGRAM, () => 'first-value');
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(TRIGRAM, () => 'second-value');
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(order).toEqual([
      `dispatch:${ACTION}`,
      `return:${INLINE}:first-value`,
      `return:${INLINE}:second-value`,
      `dispatch:${NEXT_ACTION}`,
    ]);
  });

  it('should settle a thrown inline handler error as ERROR and skip the spool', async () => {
    // Assemble
    const returns = [];
    settleInto(returns);
    const later = jest.fn();
    TAO.addInlineHandler(TRIGRAM, () => {
      throw new Error('inline boom');
    });
    TAO.addInlineHandler(NEXT_TRIGRAM, later);
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(returns).toHaveLength(1);
    expect(returns[0].phase).toBe(ERROR);
    expect(returns[0].value.message).toBe('inline boom');
    expect(later).not.toHaveBeenCalled();
  });

  it('should settle a rejected async handler as ERROR', async () => {
    // Assemble
    const returns = [];
    settleInto(returns);
    TAO.addAsyncHandler(TRIGRAM, async () => {
      throw new Error('async boom');
    });
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(returns).toHaveLength(1);
    expect(returns[0].phase).toBe(ERROR);
    expect(returns[0].value.message).toBe('async boom');
  });

  it('should not settle null/undefined handler returns', async () => {
    // Assemble
    const returns = [];
    settleInto(returns);
    TAO.addInterceptHandler(TRIGRAM, () => undefined);
    TAO.addInlineHandler(TRIGRAM, () => null);
    TAO.addAsyncHandler(TRIGRAM, async () => undefined);
    // Act
    TAO.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(returns).toEqual([]);
  });

  it('should pass undefined hooks to handlers when neither onReturn nor onProceed is decorated', () => {
    // Assemble — an observation-only decoration must NOT manufacture hooks,
    // or legacy error rethrow semantics would silently change; only onReturn
    // or onProceed decorations may produce a hooks object
    TAO._network.decorate({ onDispatch: jest.fn() });
    TAO._network.decorate({ onForward: jest.fn() });
    TAO.addInlineHandler(TRIGRAM, () => {});
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    const handleAppCon = jest.spyOn(ach, 'handleAppCon');
    // Act
    TAO.setCtx(TRIGRAM, {});
    // Assert
    expect(handleAppCon).toHaveBeenCalledTimes(1);
    expect(handleAppCon.mock.calls[0][3]).toBeUndefined();
    handleAppCon.mockRestore();
  });

  it('should pass a settlement hooks object to handlers when onReturn is decorated', () => {
    // Assemble
    TAO._network.decorate({ onReturn: jest.fn() });
    TAO.addInlineHandler(TRIGRAM, () => {});
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    const handleAppCon = jest.spyOn(ach, 'handleAppCon');
    // Act
    TAO.setCtx(TRIGRAM, {});
    // Assert
    expect(handleAppCon).toHaveBeenCalledTimes(1);
    const hooks = handleAppCon.mock.calls[0][3];
    expect(typeof hooks.onReturn).toBe('function');
    // onReturn alone must not manufacture a proceed hook
    expect(hooks.onProceed).toBeUndefined();
    handleAppCon.mockRestore();
  });

  it('should pass hooks with both onReturn and onProceed when both are decorated', () => {
    // Assemble
    TAO._network.decorate({ onReturn: jest.fn(), onProceed: jest.fn() });
    TAO.addInlineHandler(TRIGRAM, () => {});
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    const handleAppCon = jest.spyOn(ach, 'handleAppCon');
    // Act
    TAO.setCtx(TRIGRAM, {});
    // Assert
    expect(handleAppCon).toHaveBeenCalledTimes(1);
    const hooks = handleAppCon.mock.calls[0][3];
    expect(typeof hooks.onReturn).toBe('function');
    expect(typeof hooks.onProceed).toBe('function');
    handleAppCon.mockRestore();
  });

  it('should ignore a non-function onReturn on the hooks object', async () => {
    // Assemble — a malformed hooks object must fall back to legacy rethrow
    TAO.addInlineHandler(TRIGRAM, () => {
      throw new Error('legacy boom');
    });
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    // Act
    // Assert
    await expect(
      ach.handleAppCon(
        new AppCtx(TERM, ACTION, ORIENT),
        () => {},
        {},
        {
          onReturn: 42,
        },
      ),
    ).rejects.toThrow('legacy boom');
  });

  it('should key single-object AppCtx data under the action name', () => {
    // Assemble
    const seen = [];
    TAO.addInlineHandler(TRIGRAM, (tao, data) => {
      seen.push(data);
    });
    // Act
    TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT, { action: { id: 9 } }));
    // Assert — the { action } tuple key maps under the action name, not as a
    // positional term object
    expect(seen).toEqual([{ [ACTION]: { id: 9 } }]);
  });

  it('should keep legacy error behavior when no settlement is decorated', async () => {
    // Assemble — without hooks, a throwing inline handler rejects the
    // dispatch promise exactly as before (the rethrow branch)
    TAO.addInlineHandler(TRIGRAM, () => {
      throw new Error('legacy boom');
    });
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    // Act
    // Assert
    await expect(
      ach.handleAppCon(new AppCtx(TERM, ACTION, ORIENT), () => {}, {}),
    ).rejects.toThrow('legacy boom');
  });
});

describe('compatibility and defensive coverage', () => {
  it('should ignore non-AppCtx values passed to the core forward', () => {
    // Assemble — handlers hand the core forward whatever they return, so it
    // must ignore junk values (legacy NOOP-forward parity)
    let coreForward = null;
    const seen = [];
    TAO._network.decorate({
      onDispatch: (ac, envelope, handler, forward) => {
        coreForward = forward;
        seen.push(ac.key);
      },
    });
    // Act
    TAO.setCtx(TRIGRAM, {});
    // Assert
    expect(() => coreForward(42)).not.toThrow();
    expect(() => coreForward({ t: TERM })).not.toThrow();
    expect(seen).toEqual([`${TERM}|${ACTION}|${ORIENT}`]);
    // and no phantom handler registrations or dispatches from the junk values
    expect(TAO._network._handlers.has('*|*|*')).toBe(false);
    expect(TAO._network._handlers.has(undefined)).toBe(false);
  });

  it('should never let a throwing onReturn decoration break settlement', async () => {
    // Assemble
    const settled = [];
    TAO._network.decorate({
      onReturn: () => {
        throw new Error('settler boom');
      },
    });
    TAO._network.decorate({
      onReturn: (phase, value) => settled.push(`${phase}:${value}`),
    });
    TAO.addInlineHandler(TRIGRAM, () => 'settle-me');
    // Act
    // Assert
    expect(() => TAO.setCtx(TRIGRAM, {})).not.toThrow();
    await flush();
    expect(settled).toEqual([`${INLINE}:settle-me`]);
  });

  it('should settle forward errors from an intercept redirect as ERROR', async () => {
    // Assemble — direct dispatch with a throwing setAppCtx callback (the
    // legacy-forward shape Transceiver relies on)
    const returns = [];
    const hooks = {
      onReturn: (phase, value) => returns.push({ phase, value }),
    };
    TAO.addInterceptHandler(
      TRIGRAM,
      () => new AppCtx(TERM, NEXT_ACTION, ORIENT),
    );
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    const throwingForward = () => {
      throw new Error('redirect forward failed');
    };
    // Act
    await ach.handleAppCon(
      new AppCtx(TERM, ACTION, ORIENT),
      throwingForward,
      {},
      hooks,
    );
    // Assert
    expect(returns).toHaveLength(1);
    expect(returns[0].phase).toBe(ERROR);
    expect(returns[0].value.message).toBe('redirect forward failed');
  });

  it('should settle forward errors from the inline spool as ERROR', async () => {
    // Assemble
    const returns = [];
    const hooks = {
      onReturn: (phase, value) => returns.push({ phase, value }),
    };
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    const ach = TAO._network._handlers.get(`${TERM}|${ACTION}|${ORIENT}`);
    const throwingForward = () => {
      throw new Error('spool forward failed');
    };
    // Act
    await ach.handleAppCon(
      new AppCtx(TERM, ACTION, ORIENT),
      throwingForward,
      {},
      hooks,
    );
    // Assert
    expect(returns).toHaveLength(1);
    expect(returns[0].phase).toBe(ERROR);
    expect(returns[0].value.message).toBe('spool forward failed');
  });
});
