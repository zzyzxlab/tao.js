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
    expect(() => network.decorate({ chain: { key: 'x' } })).toThrow(
      /chain must be/,
    );
    expect(() => network.decorate({ chain: null })).toThrow(/chain must be/);
    expect(() =>
      network.decorate({ chain: { key: 42, next: () => ({}) } }),
    ).toThrow(/chain must be/);
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
    // Assert
    expect(hops).toHaveLength(2);
    expect(hops[0]).toEqual({ source: 'entry-only' });
    expect(hops[1]).toEqual({});
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
    // Assert — the override received the chained AppCtx with the cascade...
    expect(override).toHaveBeenCalledTimes(1);
    expect(override.mock.calls[0][0]).toBe(chained);
    expect(override.mock.calls[0][1]).toBe(entryEnvelope.cascade);
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

  it('should pass undefined hooks to handlers when no settlement is decorated', () => {
    // Assemble — an observation-only decoration must NOT manufacture hooks,
    // or legacy error rethrow semantics would silently change
    TAO._network.decorate({ onDispatch: jest.fn() });
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
