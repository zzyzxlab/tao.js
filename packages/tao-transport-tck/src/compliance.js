import { AppCtx } from '@tao.js/core';
import { Tracer, InMemorySink } from '@tao.js/telemetry';

/**
 * A connected pair of Kernels bridged by the transport under test —
 * what the `makeLink` factory must produce (a fresh one per check).
 *
 * @typedef {Object} Link
 * @property {Object} a - Kernel on the near side; each check enters signals here
 * @property {Object} b - Kernel on the far side; entries on `a` must reach it
 * @property {function(): (void|Promise<void>)} [close] - tear the link down;
 *           awaited after the check when provided
 */

/**
 * Outcome of a single conformance check.
 *
 * @typedef {Object} ComplianceResult
 * @property {string} name - the check's name, stable across releases
 *           ('delivery', 'echo suppression + bidirectional reflex',
 *           'multi-hop emission', 'chain continuity', 'cascade scoping')
 * @property {boolean} pass
 * @property {string|null} detail - failure explanation (including a thrown
 *           check's message); null on pass
 */

const DEFAULT_TIMEOUT = 2000;
const SETTLE_MS = 25;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll the predicate every 10ms until truthy or the timeout elapses.
 *
 * @param {function(): boolean} predicate
 * @param {number} timeoutMs
 * @returns {Promise<boolean>} the predicate's final verdict
 */
async function waitUntil(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  // Stryker disable next-line EqualityOperator: off-by-one on the deadline only shifts the final poll by one interval
  while (Date.now() < deadline) {
    if (predicate()) {
      return true;
    }
    await wait(10);
  }
  return predicate();
}

/**
 * Like {@link waitUntil}, followed by a settle window so exactly-once
 * assertions can catch late duplicate deliveries.
 *
 * @param {function(): boolean} predicate
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function settled(predicate, timeoutMs) {
  // reach the condition, then give late (incorrect) deliveries time to land
  const reached = await waitUntil(predicate, timeoutMs);
  await wait(SETTLE_MS);
  return reached;
}

/**
 * Build a probe trigram in the kit's reserved `{ *, run, tck }` namespace.
 *
 * @param {string} t
 * @returns {{ t: string, a: string, o: string }}
 */
function trigram(t) {
  return { t, a: 'run', o: 'tck' };
}

/**
 * Resolve a link side to its envelope surface (`enter`/`decorate`): the
 * Kernel's shared network, or the object itself when it already is one.
 *
 * @param {Object} kernel
 * @returns {Object} the underlying Network
 */
function surfaceOf(kernel) {
  // Stryker disable next-line all: defensive resolution - the makeLink contract supplies Kernels (no enter), so only the _network branch is reachable
  return typeof kernel.enter === 'function' ? kernel : kernel._network;
}

/**
 * Delivery: a signal entered on A reaches handlers on B with its trigram and
 * datagram intact, exactly once. The executable form of the §9 wire envelope
 * itself — `{ tao: { t, a, o }, data, envelope }` crossing the boundary with
 * trigram and datagram verbatim, delivered once per hop.
 *
 * @param {Link} link
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} failure detail, or null on pass
 */
async function checkDelivery({ a, b }, timeoutMs) {
  const seen = [];
  b.addInlineHandler(trigram('tckPing'), (tao, data) => {
    seen.push({ tao, data });
  });
  const datum = { tckPing: { probe: 42 } };
  a.setCtx(trigram('tckPing'), datum);
  const ok = await settled(() => seen.length >= 1, timeoutMs);
  if (!ok) {
    return 'the signal entered on A never reached the handler on B';
  }
  const { tao, data } = seen[0];
  /* istanbul ignore if -- defensive: dispatch derives `tao` from the matched AppCtx, so a mangled trigram cannot reach a matching handler */
  // Stryker disable next-line all: same defensive-unreachable reasoning as the coverage pragma above
  if (tao.t !== 'tckPing' || tao.a !== 'run' || tao.o !== 'tck') {
    // Stryker disable next-line StringLiteral: unreachable defensive branch (see pragma above)
    return `trigram arrived mangled: {${tao.t}, ${tao.a}, ${tao.o}}`;
  }
  if (!data || !data.tckPing || data.tckPing.probe !== 42) {
    return 'datagram did not survive the crossing';
  }
  if (seen.length !== 1) {
    return `expected exactly one delivery, saw ${seen.length}`;
  }
  return null;
}

/**
 * Echo suppression + bidirectional reflex: the arriving signal is not sent
 * back to its origin, but descendants chained on the receiving side are.
 * Verifies §10 invariant 4 — descendants of a received signal must be
 * re-emitted to the sender, because the receiver's `hop.source` marker is
 * hop-scoped (suppressing only the stamped arrival hop), never
 * cascade-scoped.
 *
 * @param {Link} link
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} failure detail, or null on pass
 */
async function checkReflex({ a, b }, timeoutMs) {
  let aPingDispatches = 0;
  let aPongDeliveries = 0;
  a.addInlineHandler(trigram('tckPing'), () => {
    aPingDispatches += 1;
  });
  a.addInlineHandler(trigram('tckPong'), () => {
    aPongDeliveries += 1;
  });
  b.addInlineHandler(
    trigram('tckPing'),
    () =>
      // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
      new AppCtx('tckPong', 'run', 'tck', { tckPong: {} }),
  );
  // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
  a.setCtx(trigram('tckPing'), { tckPing: {} });
  const ok = await settled(() => aPongDeliveries >= 1, timeoutMs);
  if (!ok) {
    return 'the descendant chained on B never made it back to A (reflex broken)';
  }
  if (aPingDispatches !== 1) {
    return `the arriving signal was echoed back: A dispatched tckPing ${aPingDispatches} times`;
  }
  if (aPongDeliveries !== 1) {
    return `expected exactly one reply delivery, saw ${aPongDeliveries}`;
  }
  return null;
}

/**
 * Multi-hop emission: every hop of a chain produced on the receiving side
 * crosses back, not just the first. Verifies §10 invariant 1 — every chained
 * AppCon is observable on every hop, so the transport's emit path sees (and
 * forwards) chained signals; losing later hops breaks forwarding of
 * multi-hop chains.
 *
 * @param {Link} link
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} failure detail, or null on pass
 */
async function checkMultiHop({ a, b }, timeoutMs) {
  const arrivals = [];
  a.addInlineHandler(trigram('tckStep2'), () => {
    arrivals.push('tckStep2');
  });
  a.addInlineHandler(trigram('tckStep3'), () => {
    arrivals.push('tckStep3');
  });
  b.addInlineHandler(
    trigram('tckStep1'),
    () =>
      // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
      new AppCtx('tckStep2', 'run', 'tck', { tckStep2: {} }),
  );
  b.addInlineHandler(
    trigram('tckStep2'),
    () =>
      // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
      new AppCtx('tckStep3', 'run', 'tck', { tckStep3: {} }),
  );
  // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
  a.setCtx(trigram('tckStep1'), { tckStep1: {} });
  const ok = await settled(() => arrivals.length >= 2, timeoutMs);
  if (!ok) {
    return `only ${JSON.stringify(arrivals)} of the chained hops crossed back (invariant 1)`;
  }
  if (!arrivals.includes('tckStep2') || !arrivals.includes('tckStep3')) {
    return `expected both chained hops, saw ${JSON.stringify(arrivals)}`;
  }
  return null;
}

/**
 * Chain continuity: with a Tracer on both ends, one cascade crossing
 * A→B→A carries one traceId end-to-end with exact cross-process parentage.
 * Verifies the §9 chain rules — `envelope.chain` crosses the boundary
 * verbatim and the receiver re-enters with it, so a reducer continues the
 * `taoTrace` key it owns instead of re-rooting: B's entry parents to A's
 * emitting hop, and A's continuation parents to B's reply hop.
 *
 * @param {Link} link
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} failure detail, or null on pass
 */
async function checkChainContinuity({ a, b }, timeoutMs) {
  const sinkA = new InMemorySink();
  const sinkB = new InMemorySink();
  const tracerA = new Tracer(a, { sinks: [sinkA] });
  const tracerB = new Tracer(b, { sinks: [sinkB] });
  const run = async () => {
    b.addInlineHandler(
      trigram('tckTraced'),
      () =>
        // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
        new AppCtx('tckTraceReply', 'run', 'tck', { tckTraceReply: {} }),
    );
    let replyArrived = 0;
    a.addInlineHandler(trigram('tckTraceReply'), () => {
      replyArrived += 1;
    });
    // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
    a.setCtx(trigram('tckTraced'), { tckTraced: {} });
    const ok = await settled(() => replyArrived >= 1, timeoutMs);
    if (!ok) {
      return 'the traced round trip never completed';
    }
    // Stryker disable next-line all: the probe kernels carry exclusively tckTrace* signals, so the filter is a formality
    const recA = sinkA.records.filter((r) => r.t.startsWith('tckTrace'));
    // Stryker disable next-line all: the probe kernels carry exclusively tckTrace* signals, so the filter is a formality
    const recB = sinkB.records.filter((r) => r.t.startsWith('tckTrace'));
    const traceIds = new Set([...recA, ...recB].map((r) => r.traceId));
    if (traceIds.size !== 1) {
      return `expected one traceId across the round trip, saw ${traceIds.size} (the chain did not cross)`;
    }
    // Stryker disable next-line all: dispatch order makes the entry the first record on each side; the predicate is a formality
    const aEntry = recA.find((r) => r.t === 'tckTraced');
    // Stryker disable next-line all: dispatch order makes the entry the first record on each side; the predicate is a formality
    const bEntry = recB.find((r) => r.t === 'tckTraced');
    const bReply = recB.find((r) => r.t === 'tckTraceReply');
    const aReply = recA.find((r) => r.t === 'tckTraceReply');
    /* istanbul ignore if -- defensive: the round trip completed and all records share one traceId, so every hop was traced on its own side */
    // Stryker disable next-line all: same defensive-unreachable reasoning as the coverage pragma above
    if (!aEntry || !bEntry || !bReply || !aReply) {
      // Stryker disable next-line StringLiteral: unreachable defensive branch (see pragma above)
      return 'missing hop records on one side of the boundary';
    }
    if (bEntry.parentId !== aEntry.signalId) {
      return "B's entry is not parent-linked to A's emitting hop";
    }
    if (aReply.parentId !== bReply.signalId) {
      return "A's reply continuation is not parent-linked to B's reply hop";
    }
    return null;
  };
  const detail = await run();
  tracerA.dispose();
  tracerB.dispose();
  return detail;
}

/**
 * Cascade scoping: sender-side cascade tags (process-local affinity, live
 * references) must not appear in the receiver's cascade. Verifies the §9
 * rule that `cascade` never crosses a process boundary — the transport must
 * *translate* affinity, not copy it — which is what keeps the §10 scoping
 * invariants (2, 3, 7) intact across processes.
 *
 * @param {Link} link
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} failure detail, or null on pass
 */
async function checkCascadeScoping({ a, b }, timeoutMs) {
  const cascades = [];
  const undecorate = surfaceOf(b).decorate({
    // Stryker disable next-line StringLiteral: decoration name is a diagnostic label
    name: 'tck:cascade-probe',
    onDispatch: (ac, envelope) => {
      // Stryker disable next-line all: the fresh link dispatches only tckScoped during this check; the predicate is a formality
      if (ac.t === 'tckScoped') {
        cascades.push(envelope.cascade);
      }
    },
  });
  const run = async () => {
    // Stryker disable next-line all: the cascade probe observes dispatch directly; handler registration is scenery
    b.addInlineHandler(trigram('tckScoped'), () => {});
    const senderCascade = {
      // Stryker disable next-line StringLiteral: probe value - only key presence is contractual
      tckLocalAffinity: 'a-side',
      signal:
        /* istanbul ignore next -- probe capability reference; only key presence is contractual */ () => {},
    };
    surfaceOf(a).enter(
      // Stryker disable next-line ObjectLiteral: probe payload - datagram fidelity is the delivery check's assertion
      new AppCtx('tckScoped', 'run', 'tck', { tckScoped: {} }),
      { cascade: senderCascade },
    );
    const ok = await settled(() => cascades.length >= 1, timeoutMs);
    if (!ok) {
      return 'the scoped entry never reached B';
    }
    const received = cascades[0];
    if (received === senderCascade) {
      return 'the cascade object itself crossed the boundary (must never)';
    }
    if ('tckLocalAffinity' in received || 'signal' in received) {
      return 'sender-side cascade tags crossed the boundary (must be translated, not copied)';
    }
    return null;
  };
  const detail = await run();
  undecorate();
  return detail;
}

const CHECKS = [
  ['delivery', checkDelivery],
  ['echo suppression + bidirectional reflex', checkReflex],
  ['multi-hop emission', checkMultiHop],
  ['chain continuity', checkChainContinuity],
  ['cascade scoping', checkCascadeScoping],
];

/**
 * Run the transport conformance kit (ENVELOPE-SPEC.md §9 plus the
 * transport-relevant §10 invariants) against a transport. Framework-agnostic:
 * returns structured results for any test runner instead of throwing.
 *
 * @param {function(): (Link|Promise<Link>)} makeLink - factory producing a
 *        connected pair `{ a, b, close }` of Kernels bridged by the
 *        transport under test (loopback in-process is fine). A fresh link is
 *        created per check and closed after it.
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs=2000] - per-check delivery timeout
 * @returns {Promise<{ pass: boolean, results: ComplianceResult[] }>} one
 *          result per check, in the order run; `pass` is the conjunction
 */
export async function runTransportCompliance(
  makeLink,
  { timeoutMs = DEFAULT_TIMEOUT } = {},
) {
  if (typeof makeLink !== 'function') {
    throw new Error(
      'runTransportCompliance requires a makeLink factory producing { a, b, close }',
    );
  }
  const results = [];
  for (const [name, check] of CHECKS) {
    const link = await makeLink();
    let detail = null;
    try {
      detail = await check(link, timeoutMs);
    } catch (err) {
      detail = `check threw: ${err && err.message ? err.message : err}`;
    } finally {
      if (link && typeof link.close === 'function') {
        await link.close();
      }
    }
    results.push({ name, pass: detail == null, detail });
  }
  return { pass: results.every((r) => r.pass), results };
}

/**
 * Convenience for test suites: runs the kit and throws a formatted error
 * naming every failed check.
 *
 * @param {function(): (Link|Promise<Link>)} makeLink - see {@link runTransportCompliance}
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs=2000] - per-check delivery timeout
 * @returns {Promise<ComplianceResult[]>} every check's result (all passing)
 * @throws {Error} listing each failed check with its detail
 */
export async function assertTransportCompliance(makeLink, opts) {
  const { pass, results } = await runTransportCompliance(makeLink, opts);
  if (!pass) {
    const failed = results
      .filter((r) => !r.pass)
      .map((r) => `  ✗ ${r.name}: ${r.detail}`)
      .join('\n');
    throw new Error(`transport failed conformance:\n${failed}`);
  }
  return results;
}
