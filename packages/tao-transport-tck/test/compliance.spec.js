import { Kernel, AppCtx } from '@tao.js/core';
import { createTransport, enterFromWire, wireEnvelope } from '@tao.js/utils';
import {
  runTransportCompliance,
  assertTransportCompliance,
} from '../src/compliance';

/**
 * A correct loopback link built on the utils duplex helper: two kernels,
 * each side's send feeding the other side's receive.
 */
function makeGoodLink() {
  const a = new Kernel();
  const b = new Kernel();
  let tA;
  let tB;
  tA = createTransport(a, {
    send: (tao, data, wire) => tB.receive(tao, data, wire),
  });
  tB = createTransport(b, {
    send: (tao, data, wire) => tA.receive(tao, data, wire),
  });
  return {
    a,
    b,
    close: () => {
      tA.dispose();
      tB.dispose();
    },
  };
}

/**
 * Hand-built links with one deliberate defect each. Built from raw
 * decorations + enterFromWire so a single behavior can be sabotaged.
 */
function makeRawLink({
  dropChain = false,
  dropHopMarker = false,
  entriesOnly = false,
  copyCascade = false,
  copyCascadeKeys = false,
  dropData = false,
  dead = false,
  mangleTrigram = false,
  mangleData = false,
  duplicate = false,
  dropStep3 = false,
  rewriteReplyParent = false,
  rewriteEntryParent = false,
  copyOnlySignalKey = false,
  copyOnlyAffinityKey = false,
} = {}) {
  const a = new Kernel();
  const b = new Kernel();
  const disposers = [];
  const wire = (from, fromName, to, toName) => {
    const undecorate = from._network.decorate({
      name: `raw:${fromName}`,
      onDispatch: (ac, envelope) => {
        if (dead) {
          return;
        }
        if (envelope.hop.source === fromName) {
          return;
        }
        if (entriesOnly && envelope.hop.via) {
          return;
        }
        if (dropStep3 && ac.t === 'tckStep3') {
          return;
        }
        const payload = wireEnvelope(envelope);
        if (copyCascade) {
          payload.cascade = envelope.cascade;
        }
        if (copyCascadeKeys) {
          payload.cascade = { ...envelope.cascade };
        }
        if (
          rewriteReplyParent &&
          ac.t === 'tckTraceReply' &&
          payload.chain &&
          payload.chain.taoTrace
        ) {
          payload.chain = {
            taoTrace: {
              ...payload.chain.taoTrace,
              signalId: 'forged00000000ff',
            },
          };
        }
        if (
          rewriteEntryParent &&
          ac.t === 'tckTraced' &&
          payload.chain &&
          payload.chain.taoTrace
        ) {
          payload.chain = {
            taoTrace: {
              ...payload.chain.taoTrace,
              signalId: 'forged00000000aa',
            },
          };
        }
        if (copyOnlySignalKey) {
          payload.cascade = { signal: envelope.cascade.signal || (() => {}) };
        }
        if (copyOnlyAffinityKey) {
          payload.cascade = {
            tckLocalAffinity: envelope.cascade.tckLocalAffinity,
          };
        }
        const tao = ac.unwrapCtx();
        if (mangleTrigram) {
          tao.t = `${tao.t}Mangled`;
        }
        const mangled = mangleData
          ? { ...ac.data, tckPing: { probe: 41 } }
          : ac.data;
        const send = () =>
          deliver(to, toName, tao, dropData ? undefined : mangled, payload);
        send();
        if (duplicate) {
          send();
        }
      },
    });
    disposers.push(undecorate);
  };
  const deliver = (to, toName, tao, data, payload) => {
    if (
      copyCascade ||
      copyCascadeKeys ||
      copyOnlySignalKey ||
      copyOnlyAffinityKey
    ) {
      to._network.enter(new AppCtx(tao.t, tao.a, tao.o, data), {
        cascade: payload.cascade,
        hop: { source: toName },
        chain: payload.chain,
      });
      return;
    }
    enterFromWire(
      to,
      tao,
      data,
      dropChain ? undefined : payload,
      dropHopMarker && toName === 'rawB' ? undefined : toName,
    );
  };
  wire(a, 'rawA', b, 'rawB');
  wire(b, 'rawB', a, 'rawA');
  return {
    a,
    b,
    close: () => disposers.forEach((dispose) => dispose()),
  };
}

function resultFor(results, name) {
  return results.find((r) => r.name === name);
}

describe('runTransportCompliance', () => {
  it('requires a makeLink factory', async () => {
    await expect(runTransportCompliance()).rejects.toThrow(
      /requires a makeLink factory/,
    );
  });

  it('passes a correct duplex loopback on all five checks', async () => {
    const { pass, results } = await runTransportCompliance(makeGoodLink, {
      timeoutMs: 1000,
    });
    expect(results).toHaveLength(5);
    for (const result of results) {
      expect(result.detail).toBeNull();
      expect(result.pass).toBe(true);
    }
    expect(pass).toBe(true);
  });

  it('fails chain continuity when the transport drops the wire envelope', async () => {
    const { pass, results } = await runTransportCompliance(
      () => makeRawLink({ dropChain: true }),
      { timeoutMs: 1000 },
    );
    expect(pass).toBe(false);
    const continuity = resultFor(results, 'chain continuity');
    expect(continuity.pass).toBe(false);
    // chain dropped in BOTH directions: A entry, B re-root, A re-root again
    expect(continuity.detail).toBe(
      'expected one traceId across the round trip, saw 3 (the chain did not cross)',
    );
    expect(resultFor(results, 'delivery').pass).toBe(true);
    expect(
      resultFor(results, 'echo suppression + bidirectional reflex').pass,
    ).toBe(true);
    expect(resultFor(results, 'multi-hop emission').pass).toBe(true);
    expect(resultFor(results, 'cascade scoping').pass).toBe(true);
  });

  it('fails echo suppression when the receiver skips the hop marker', async () => {
    const { pass, results } = await runTransportCompliance(
      () => makeRawLink({ dropHopMarker: true }),
      { timeoutMs: 1000 },
    );
    expect(pass).toBe(false);
    const reflex = resultFor(
      results,
      'echo suppression + bidirectional reflex',
    );
    expect(reflex.pass).toBe(false);
    expect(reflex.detail).toBe(
      'the arriving signal was echoed back: A dispatched tckPing 2 times',
    );
  });

  it('fails multi-hop emission when only entry hops are forwarded', async () => {
    const { pass, results } = await runTransportCompliance(
      () => makeRawLink({ entriesOnly: true }),
      { timeoutMs: 500 },
    );
    expect(pass).toBe(false);
    const multiHop = resultFor(results, 'multi-hop emission');
    expect(multiHop.pass).toBe(false);
    expect(multiHop.detail).toBe(
      'only [] of the chained hops crossed back (invariant 1)',
    );
    expect(resultFor(results, 'delivery').pass).toBe(true);
  });

  it('fails cascade scoping when the transport copies the cascade', async () => {
    const { pass, results } = await runTransportCompliance(
      () => makeRawLink({ copyCascade: true }),
      { timeoutMs: 1000 },
    );
    expect(pass).toBe(false);
    const scoping = resultFor(results, 'cascade scoping');
    expect(scoping.pass).toBe(false);
    expect(scoping.detail).toBe(
      'the cascade object itself crossed the boundary (must never)',
    );
  });

  it('fails delivery when the datagram is dropped', async () => {
    const { pass, results } = await runTransportCompliance(
      () => makeRawLink({ dropData: true }),
      { timeoutMs: 1000 },
    );
    expect(pass).toBe(false);
    const delivery = resultFor(results, 'delivery');
    expect(delivery.pass).toBe(false);
    expect(delivery.detail).toBe('datagram did not survive the crossing');
  });

  it('reports a throwing makeLink as a failed check, not a crash', async () => {
    let calls = 0;
    const { pass, results } = await runTransportCompliance(
      () => {
        calls += 1;
        if (calls === 1) {
          const link = makeGoodLink();
          link.a = null; // first check throws inside
          return link;
        }
        return makeGoodLink();
      },
      { timeoutMs: 500 },
    );
    expect(pass).toBe(false);
    expect(results[0].pass).toBe(false);
    expect(results[0].detail).toBe(
      "check threw: Cannot read properties of null (reading 'setCtx')",
    );
    expect(results[1].pass).toBe(true);
  });

  it('formats non-Error throws without a message property', async () => {
    // exposes enter+decorate directly so surfaceOf takes its direct-surface arm
    const stub = {
      addInlineHandler: () => {},
      enter: () => {},
      decorate: () => () => {},
      setCtx: () => {
        // eslint-disable-next-line no-throw-literal
        throw 'boom-string';
      },
    };
    const { results } = await runTransportCompliance(
      () => ({ a: stub, b: stub, close: () => {} }),
      { timeoutMs: 200 },
    );
    expect(results[0].detail).toBe('check threw: boom-string');
  });
});

describe('runTransportCompliance failure details', () => {
  it('reports every check failed for a dead link', async () => {
    const { pass, results } = await runTransportCompliance(
      () => makeRawLink({ dead: true }),
      { timeoutMs: 200 },
    );
    expect(pass).toBe(false);
    expect(resultFor(results, 'delivery').detail).toBe(
      'the signal entered on A never reached the handler on B',
    );
    expect(
      resultFor(results, 'echo suppression + bidirectional reflex').detail,
    ).toBe(
      'the descendant chained on B never made it back to A (reflex broken)',
    );
    expect(resultFor(results, 'multi-hop emission').detail).toBe(
      'only [] of the chained hops crossed back (invariant 1)',
    );
    expect(resultFor(results, 'chain continuity').detail).toBe(
      'the traced round trip never completed',
    );
    expect(resultFor(results, 'cascade scoping').detail).toBe(
      'the scoped entry never reached B',
    );
  });

  it('reports a mangled trigram', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ mangleTrigram: true }),
      { timeoutMs: 200 },
    );
    expect(resultFor(results, 'delivery').detail).toMatch(
      /never reached the handler/,
    );
  });

  it('reports duplicate deliveries and duplicate replies', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ duplicate: true }),
      { timeoutMs: 500 },
    );
    expect(resultFor(results, 'delivery').detail).toBe(
      'expected exactly one delivery, saw 2',
    );
    expect(
      resultFor(results, 'echo suppression + bidirectional reflex').detail,
    ).toBe(
      // each duplicated arrival chains its own reply, which is duplicated again
      'expected exactly one reply delivery, saw 4',
    );
  });

  it('reports a partially-crossing multi-hop chain', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ dropStep3: true }),
      { timeoutMs: 300 },
    );
    expect(resultFor(results, 'multi-hop emission').detail).toMatch(
      /invariant 1/,
    );
  });

  it('reports a chain that repeats one hop while dropping another', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ duplicate: true, dropStep3: true }),
      { timeoutMs: 300 },
    );
    expect(resultFor(results, 'multi-hop emission').detail).toBe(
      'expected both chained hops, saw ["tckStep2","tckStep2","tckStep2","tckStep2"]',
    );
  });

  it('reports a mangled datagram value', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ mangleData: true }),
      { timeoutMs: 500 },
    );
    expect(resultFor(results, 'delivery').detail).toBe(
      'datagram did not survive the crossing',
    );
  });

  it('reports a forged entry-direction parent link', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ rewriteEntryParent: true }),
      { timeoutMs: 500 },
    );
    expect(resultFor(results, 'chain continuity').detail).toBe(
      "B's entry is not parent-linked to A's emitting hop",
    );
  });

  it('reports a copied affinity tag alone', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ copyOnlyAffinityKey: true }),
      { timeoutMs: 500 },
    );
    expect(resultFor(results, 'cascade scoping').detail).toBe(
      'sender-side cascade tags crossed the boundary (must be translated, not copied)',
    );
  });

  it('reports a copied live signal reference alone', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ copyOnlySignalKey: true }),
      { timeoutMs: 500 },
    );
    expect(resultFor(results, 'cascade scoping').detail).toBe(
      'sender-side cascade tags crossed the boundary (must be translated, not copied)',
    );
  });

  it('reports a forged cross-process parent link', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ rewriteReplyParent: true }),
      { timeoutMs: 500 },
    );
    expect(resultFor(results, 'chain continuity').detail).toBe(
      "A's reply continuation is not parent-linked to B's reply hop",
    );
  });

  it('reports copied cascade keys even in a fresh object', async () => {
    const { results } = await runTransportCompliance(
      () => makeRawLink({ copyCascadeKeys: true }),
      { timeoutMs: 500 },
    );
    expect(resultFor(results, 'cascade scoping').detail).toBe(
      'sender-side cascade tags crossed the boundary (must be translated, not copied)',
    );
  });
});

describe('link lifecycle', () => {
  it('closes every per-check link exactly once', async () => {
    let closes = 0;
    const { pass } = await runTransportCompliance(
      () => {
        const link = makeGoodLink();
        const close = link.close;
        return {
          ...link,
          close: () => {
            closes += 1;
            return close();
          },
        };
      },
      { timeoutMs: 1000 },
    );
    expect(pass).toBe(true);
    expect(closes).toBe(5);
  });

  it('tolerates links without a close function', async () => {
    const { pass } = await runTransportCompliance(
      () => {
        const link = makeGoodLink();
        return { a: link.a, b: link.b };
      },
      { timeoutMs: 1000 },
    );
    expect(pass).toBe(true);
  });
});

describe('assertTransportCompliance', () => {
  it('resolves with the results for a conformant transport', async () => {
    const results = await assertTransportCompliance(makeGoodLink, {
      timeoutMs: 1000,
    });
    expect(results).toHaveLength(5);
    expect(results.every((r) => r.pass)).toBe(true);
  });

  it('throws a formatted report naming every failed check', async () => {
    let thrown;
    try {
      await assertTransportCompliance(() => makeRawLink({ dropChain: true }), {
        timeoutMs: 500,
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    expect(thrown.message).toContain('transport failed conformance:\n');
    expect(thrown.message).toContain(
      '  ✗ chain continuity: expected one traceId across the round trip, saw 3 (the chain did not cross)',
    );
    // passing checks are not listed
    expect(thrown.message).not.toContain('delivery');
    expect(thrown.message).not.toContain('reflex');
  });

  it('lists multiple failed checks on separate lines', async () => {
    let thrown;
    try {
      await assertTransportCompliance(() => makeRawLink({ dead: true }), {
        timeoutMs: 200,
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown.message).toContain(
      'the signal entered on A never reached the handler on B\n  ✗ ',
    );
  });
});
