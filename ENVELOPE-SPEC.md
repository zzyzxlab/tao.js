# Signal Envelope & Network Decoration — Design Spec

Status: **implemented** on `feat/network-envelope` (see §11 for the
verification record; end-to-end proof at
`tools/smoke/socketio-envelope-smoke.cjs`).
Scope: `@tao.js/core` internals, `@tao.js/utils` adapters, new `@tao.js/telemetry` +
`@tao.js/opentelemetry`. **Zero changes** to the app-facing TAO surface.

This is the final hardening of the JS implementation's signal plane. It also
serves as the reference model for cross-process transports and future
implementations in other languages: the envelope scopes + trigram + handler
phases defined here _are_ the protocol.

---

## 1. Motivation

The Kernel/Network split was a deliberate design: `Kernel` is the consumer
surface (trigrams, three handler phases, chaining by return), `Network` is the
wiring surface (`control` envelope, `forwardAppCtx`, middleware) that exists so
adapters like `Channel` and `Transponder` can make client-server topologies
work without exposing any of it to TAO consumers. The intended end state was a
Network that adapters could **decorate additively** — non-competitively.

Decoration is already non-competitive for _observation_ (`network.use()`
middleware coexist freely). It is competitive for exactly one resource: **the
single `forwardAppCtx` slot per dispatch**. Whoever enters a signal owns
forwarding for the entire cascade. Every adapter reimplements the threading
convention by hand, and the envelope's lifetime is whatever that adapter's
forward happens to implement.

Evidence this implicit contract is error-prone (all in-repo):

- `Relay` assigns `this.forwardAppCtx = kernel.forwardAppCtx` — an unbound
  reference; a chained AppCon from a Relay-entered signal throws.
- `Transponder` passes no forward to `setCtxControl`; attached directly to a
  Kernel/Network the default `NOOP` silently kills every chain (works only
  nested in a `Channel`).
- `Transceiver.captureSignal` is a full fork of `AppCtxHandlers.handleAppCon`
  because there is no hook for non-AppCtx handler returns (its own TODO asks
  for one).
- `Channel.forwardAppCtx`'s internal re-entry `(a) => this.setAppCtx(a)` drops
  the envelope for chains produced by channel-attached handlers.
- Causal tracing (the `feat/tao-trace` prototype) required monkey-patching
  `forwardAppCtx` per entry surface (`instrument()`), because trace context
  needs a per-hop lifetime no forwarder provides.

## 2. Current envelope lifetimes (survey result)

Every use of `control` across core, utils, koa, socket.io, router, react,
http-client, and the examples falls into exactly three lifetimes:

| lifetime                                            | needed by                                                                                                                        | mechanism today                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **cascade** — one shared mutable object per cascade | `Channel.channelId`; `Transponder`/`Transceiver` `signal` + `signalled` (resolve-once **requires** shared mutation); `seive` tag | forwarder passes the same object every hop                  |
| **hop** — visible on the entry dispatch only        | `Source.source` (echo suppression must apply to the first hop only; chained responses **must** flow back out)                    | falls out of plain `Kernel` _dropping_ control between hops |
| **chain** — derived parent → child each hop         | trace context; nothing else yet                                                                                                  | does not exist                                              |

Load-bearing consequence: `Kernel`'s control-drop is **not a bug** — Source
semantics (the socket.io bidirectional reflex) depend on it. `Channel`'s
control-share is also not a bug — resolve-once depends on it. The defect is
that lifetime is implicit and forwarder-defined. The redesign makes lifetime
explicit per envelope section and moves hop transitions into the Network.

External surface actually used by consumers (in-repo and field surveys;
the behavioral invariants they yielded are §10):

- Kernel: `setCtx`, `setAppCtx`, `add*/remove*Handler`, `clone`. No in-repo
  consumer uses `asPromiseHook` (early implementation superseded by
  Transponder; frozen as-is).
- Adapters: public constructors + methods only (`Transponder.detach()`
  included). No consumer outside utils touches `setCtxControl`,
  `forwardAppCtx`, `_network`, or hand-built `control` objects.

## 3. Design overview

> **Status:** as of 0.19.0 the compatibility boundary below is history — the
> frozen legacy line was removed per §12, and `enter()` + `decorate()` are
> the entire dispatch surface. §§3–7 read as the design rationale; the flow
> in §4 and the interface in §5 are kept current.

Three additions to `Network`, one to `AppCtxHandlers`; nothing removed
until the §12 cutover:

1. **Envelope** — the dispatch context, with three explicit sections:
   - `envelope.cascade` — the legacy `control` object itself, same reference
     across the whole cascade. All existing keys (`channelId`,
     `transponderId`, `signal`, `signalled`, `source`…) continue to live here
     as top-level properties; legacy reads/writes/mutation semantics are
     preserved verbatim.
   - `envelope.hop` — fresh `{}` per hop; entry values provided at `enter()`.
   - `envelope.chain` — per-hop derived state, computed by registered
     reducers; keyed by reducer namespace. JSON-serializable by design (this
     is what transports carry for cross-process continuity).
2. **Hop engine** — in v2 mode the Network owns forwarding: chained AppCons
   are dispatched **exactly once by core**; decorators may mirror, annotate,
   settle — never re-enter the main dispatch.
3. **Decorator registry** — `network.decorate(spec)`, the additive,
   non-competitive adapter interface (§5).
4. **Settlement hook** — `AppCtxHandlers.handleAppCon` accepts an optional
   `onReturn` sink for non-AppCtx handler returns, retiring Transceiver's
   dispatch fork (§6).

### Compatibility boundary (the frozen line — removed in 0.19.0, see §12)

- `setCtxControl` / `setAppCtxControl` **with an explicit `forwardAppCtx`**:
  legacy mode, bit-for-bit today's behavior. The caller's forward owns the
  cascade exactly as now. Third-party code on this path is untouched.
- `setCtxControl` / `setAppCtxControl` **without a forward**: also frozen
  (forward = NOOP, chains do not propagate — today's behavior, which
  Transponder-on-Channel relies on being _supplied by Channel_, not core).
- **`network.enter(ac, { data, cascade, hop })`** — the new, only gate into
  the v2 hop engine. `Kernel.setCtx`/`setAppCtx` and the migrated utils
  adapters switch to it internally.
- Middleware signature gains a **fifth argument** `envelope`
  (`(handler, ac, forwardAppCtx, control, envelope)`); existing middleware
  ignore it. `control === envelope.cascade`, so legacy middleware reading
  control keys observe identical values.
- Handler signature `(tao, data)` — untouched, envelope never exposed.

Observable difference of Kernel entries moving to v2: the (empty) cascade
object is now shared across hops instead of reset. The only in-repo observer
of that distinction is `Source`, which migrates to hop scope in the same
change (behavior preserved: suppress echo on the stamped hop only). No surveyed consumer depended on per-hop reset
of custom cascade keys.

## 4. Dispatch flow

```
network.enter(ac, { cascade, hop, chain, forward? })
  └─ envelope = { cascade: cascade || {}, hop: hop || {}, chain: reduceChain(chain, ac) }
     dispatch(ac, envelope):
       1. for each decorator with chain reducers: already applied (envelope.chain)
       2. for each decorator: onDispatch(ac, envelope, handler, forward)
       3. handler.handleAppCon(ac, coreForward, envelope.cascade, hooks)
          — the Network owns handler execution (0.19); hooks built from
            onReturn decorations (§6); coreForward is the enter() `forward`
            override when given, else the hop engine below
       4. handler chains AppCon `next` → coreForward(next):
          a. nextEnvelope = { cascade: envelope.cascade,        // same ref
                              hop: {},                          // reset
                              chain: reduceChain(envelope.chain, next) }
          b. for each decorator: onForward(next, nextEnvelope,
               { from: envelope, forward })
             — mirrors to private networks happen here (Channel._channel, …);
               `forward(chainedAc)` continues the cascade from this hop
          c. dispatch(next, nextEnvelope)                        // exactly once
```

The `forward` option on `enter()` is network-composition plumbing: an
adapter mirroring a cascade onto a **private** network passes the main
network's continuation (`meta.forward`, or the `onDispatch` fourth argument)
so AppCons chained by privately-dispatched handlers continue the cascade
envelope through the main hop engine instead of re-entering with a fresh
one. It is not an application-level surface.

### `hop.via` — the producing phase (0.20)

Chained hops carry which handler phase produced them:
`hop: { via: 'Intercept' | 'Async' | 'Inline' }` (the exported phase
constants). Entry hops keep their caller-supplied hop and never carry
`via`. The phase is known statically at the three chain-origin sites in
`AppCtxHandlers._handlePhases` and is threaded through the core forward;
it is **hop** data because it describes the edge between parent and child
— single-hop lifetime, not cascade-shared. `via` never crosses a process
boundary (hop is boundary-local; the edge that produced a remote
continuation _is_ the transport). Symmetry: `onReturn` reports the phase
of non-AppCtx returns; `hop.via` reports the phase of AppCtx chains.

### `Network.mirror(ac, envelope, forward)` — same-hop dispatch (0.20)

A mirrored dispatch is the **same hop** observed on a second registry, so
its envelope must be the original envelope — same cascade reference, same
`hop` (including `source` and `via`), same `chain` — not a re-derived one.
`mirror(ac, envelope, forward)` dispatches on the receiving network with
the envelope **verbatim** (no chain reduction, no hop reset); `forward` is
the continuation chains should follow (normally the mirroring hop's
`meta.forward`). Channel and Transceiver mirror with this instead of
`enter()`; `enter()` remains the gate for genuinely _new_ entries.

Ordering guarantees (pinned by tests):

- `onForward` mirrors run **before** the main-network dispatch of the chained
  AppCon (preserves Channel's `_channel`-first ordering).
- Decorator invocation order is registration order; correctness must not
  depend on it (self-filtering by envelope keys, as all current adapters
  already do).
- Chained AppCons within one handler spool dispatch in spool order.
- Wildcard AppCons chained by handlers are dropped per the owning Kernel's
  `canSetWildcard`, exactly as `Kernel.setAppCtx` does.

Async timing note (normative): everything after a dispatch's synchronous
start — intercept awaits, async forks, inline spool, all chaining — resumes
on microtasks. Entry stamping of an envelope during the synchronous start is
therefore race-free.

## 5. Decorator interface

```js
const dispose = network.decorate({
  name: 'channel:abc',                      // diagnostic
  onDispatch(ac, envelope, handler, forward) {},  // observe every dispatch;
                                            // forward(chainedAc) continues
                                            // this hop's cascade (§4)
  onForward(nextAc, envelope, meta) {},     // mirror/route a chained AppCon;
                                            // meta = { from, forward }
  onReturn(phase, value, ac, envelope) {},  // settle non-AppCtx handler returns
  onProceed(ac, envelope) {},               // fires when the intercept phase
                                            // passes (no halt, no divert),
                                            // before async/inline run (0.20)
  chain: {                                  // per-hop reducer, namespaced
    key: 'trace',
    next(prev, ac, envelope) { return {...}; },   // prev = parent hop's value
  },
});
```

`onProceed` exists for **veto-respecting emitters**: observers that must
honor the intercept veto (§10 invariant 5) but need the envelope, which
the handler signature `(tao, data)` never exposes. The socket.io server
reply path is the motivating case: it previously emitted from a wildcard
inline handler (envelope-blind); as an `onProceed` decoration it emits
with the hop's chain while intercept-halted and -diverted signals remain
suppressed. `onDispatch` remains the phase-blind observation point
(Source's historical emit semantics); `onProceed` is the phase-gated one.

Composition laws (what "non-competitive" means, normatively):

| capability    | law                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `onDispatch`  | commutes freely (pure observation)                                                              |
| envelope keys | commute iff namespaced: cascade keys owned by their adapter; chain keys by reducer namespace    |
| `onForward`   | commutes because mirrors are self-filtered by cascade keys and **never** re-enter main dispatch |
| `onReturn`    | first-settlement-wins per entry, self-scoped by cascade key (`transceiverId`)                   |

`network.use()` was removed in 0.19.0 (§12): `decorate({ onDispatch })` is
its strict superset. `Channel` exposes the same decoration contract for its
private network via `Channel.decorate(spec)`, and channel-scoped entry via
`Channel.enter(ac, { cascade, hop, chain })` — how wrapping adapters
(Transponder) compose with a Channel without touching its internals.

## 6. Settlement hook

`AppCtxHandlers.handleAppCon(ac, setAppCtx, control, hooks?)` where
`hooks.onReturn(phase, value)` receives what today is discarded or forked:

- intercept: truthy non-AppCtx return → `onReturn('intercept', value)`;
  propagation still halts (unchanged).
- async / inline: non-null non-AppCtx return → `onReturn(phase, value)`.
- thrown errors: `onReturn('error', err)` when hooks present; legacy
  swallow/log behavior when absent (unchanged default).

With no hooks the dispatch loop is behaviorally identical to today.
`Transceiver` becomes: cascade key + `onReturn` mapping (intercept→reject,
async/inline→resolve, error→reject, first wins) — its `captureSignal` fork is
deleted.

## 7. Adapter migration table

Public constructors, methods, and observable semantics are frozen; only
internals move. Each row lands as its own commit against the existing test +
mutation suites.

| adapter                                                        | today                                                                                                                       | becomes                                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Channel`                                                      | entry stamps `channelId`; hand forward shares control, mirrors to `_channel`, re-dispatches main                            | `enter()` with cascade `{channelId}`; decorator `onForward` mirrors matching cascades to `_channel`; core dispatches main. Internal re-entry `(a) => this.setAppCtx(a)` replaced by envelope-preserving path — closes the channel-handler-chain gap |
| `Source`                                                       | entry stamps `source` in control; middleware suppresses echo; relies on Kernel hop-drop                                     | `enter()` with hop `{source}`; `onDispatch` checks `envelope.hop.source` (legacy fallback: `cascade.source`). Reflex semantics identical                                                                                                            |
| `Relay`                                                        | unexported; unbound `forwardAppCtx` bug                                                                                     | fixed alongside Source (same shape); stays unexported                                                                                                                                                                                               |
| `Transponder`                                                  | entry-only; control `{transponderId, signal}`; resolve-once via shared mutation; relies on wrapper (Channel) for forwarding | `enter()` on the wrapped surface with cascade `{transponderId, signal}`; `onDispatch` settles. Attached to a bare Kernel it now participates in v2 forwarding (documented improvement: chains propagate; resolve-once semantics unchanged)          |
| `Transceiver`                                                  | own forward (shares control) + full dispatch fork (`captureSignal`)                                                         | `enter()` with cascade key; `onForward` mirrors to `_signals`; `onReturn` settlement; fork deleted                                                                                                                                                  |
| `seive`                                                        | middleware clone-and-redirect                                                                                               | unchanged behavior; becomes `onDispatch` + mirror using the same clone semantics                                                                                                                                                                    |
| bridges / forward-chain / transfer / TaoLogger / trigramFilter | handler-level or pure                                                                                                       | untouched (bridge cross-kernel envelope threading is a future option, default off)                                                                                                                                                                  |
| koa / socket.io / router / react / http-client / examples      | public APIs only                                                                                                            | untouched; suites re-run as regression gate                                                                                                                                                                                                         |

`asPromiseHook`: frozen legacy (predates Network + Transponder; no in-repo
consumers). Kept working via its existing inline-handler implementation.

## 8. Trace as the proof of decoration

`@tao.js/telemetry` (tracer ported from the `feat/tao-trace` prototype) becomes a pure
decorator: `onDispatch` observer + a `chain` reducer stamping
`{ traceId, signalId, parentId }` (W3C-shaped ids). **No `instrument()`.**
Full causal fidelity for every entry surface — kernels, channels,
transponder/transceiver entries, Source entries, and channel-attached handler
chains — because every v2 hop passes through the reducer. Legacy-mode entries
(third-party `setCtxControl` with own forward) degrade to flat linkage,
never corruption. `@tao.js/opentelemetry` ports unchanged (consumes records).

## 9. Cross-process wire contract (normative as of 0.20)

`envelope.chain` is JSON-clean by construction and is the **only** envelope
scope that crosses a process boundary. `cascade` never crosses (live
function references; process-local affinity that the transport must
_translate_, not copy). `hop` never crosses (boundary-local; the receiver
stamps its own `source` marker, and `via` describes a local edge).

### Wire envelope

A duplex transport forwards a signal by serializing, alongside its own
protocol framing:

```js
{ tao: { t, a, o }, data, envelope: { v: 1, chain } }
```

- `v` — wire-envelope version, integer, starts at `1`. Receivers ignore
  envelopes with an unknown `v` (treat as absent) rather than fail.
- `chain` — the sending hop's `envelope.chain`, verbatim. May be absent
  (pre-0.20 senders); the receiver treats absent/invalid chain as `null`.
- The receiving side re-enters with
  `enter(ac, { hop: { source: <its own name> }, chain })` — its own
  reducers continue keys they own and re-root keys they don't recognize.

Backward compatibility is one-sided by construction: a 0.20 receiver
accepts payloads without `envelope`; a pre-0.20 receiver ignores the
extra `envelope` property.

### Request/response transports (HTTP)

Map the tracing chain key to W3C `traceparent`: an inbound request's
`traceparent` header becomes
`chain: { taoTrace: { traceId, signalId: parentId } }` on entry
(`@tao.js/telemetry` owns the codec). There is no standard W3C response
header (`traceresponse` remains a draft), so responses carry no chain in
0.20; full-chain HTTP transport via a custom header is a possible future
`v` bump, not current contract.

### Conformance

`@tao.js/transport-tck` is the executable form of this section plus the
transport-relevant §10 invariants (delivery, echo suppression with the
bidirectional reflex, multi-hop emission, chain continuity across a
round trip, cascade scoping). A transport that passes the TCK against a
loopback link honors this contract. This three-scope contract — not the
JS API — is what a Go/Rust/Python implementation must honor, plus the
phase semantics (intercept-halt, async-fork, inline-spool) documented in
AGENTS.md.

## 10. Behavioral invariants

Distilled from field surveys of real tao.js applications during design;
normative for this redesign, the §12 cutover, and any future
implementation of the signal plane. Executable forms live in the package
test suites and `tools/smoke/socketio-envelope-smoke.cjs`.

1. Every chained AppCon is observable on **every hop** (a Source's emit
   middleware must see chained signals, or client→server forwarding of
   multi-hop chains breaks).
2. Channel-entered cascades retain `channelId` scoping **end-to-end**
   (per-client reply routing; loss = silent request/response death,
   over-broadcast = cross-client data leak).
3. Kernel-entered cascades remain **unscoped** (an empty cascade must
   never acquire channel/source tagging, or server-internal chains would
   be emitted to connected clients).
4. Descendants of a **server-received** signal must be re-emitted to the
   server (Source's `source` marker applies to the stamped hop only —
   hop scope, not cascade scope).
5. Intercept-halt (truthy return) suppresses the signal for **all** later
   phases including wildcard `{}` inline handlers (the socket emit path).
6. **Handler-return semantics and phase order are load-bearing**:
   intercept AppCtx-divert suppresses remaining handlers; intercept
   truthy halts; intercept undefined observes; inline/async AppCtx
   chains — all preserved exactly, including wildcard-intercept loggers
   firing first.
7. **Chain affinity is exact**: a cascade entered on a per-request
   Channel keeps that channel's scoping for all hops; a kernel-entered
   cascade never acquires scoping; a Transponder/Transceiver cascade tag
   survives multi-hop chains so its awaited promise settles.
8. **No added macrotask hops in dispatch**: chained dispatch stays on
   the same synchronous/microtask schedule — consumers legitimately
   drain pending async work with a single `setImmediate`, and UI code
   assumes inline completion ordering.

Deployment note: field lockfiles showed mixed patch versions in practice
(core 0.16.0 running under utils/socket.io 0.16.2). v2 adapters call
`network.enter()`/`decorate()`, which old cores lack — so utils (and
socket.io/koa via utils) must declare a peerDependency floor on the new
core at release, and adapters fail fast with a clear error on a
pre-envelope core rather than misbehave.

## 11. Rollout & verification

1. Spec commit (this document).
2. Core: envelope + hop engine + decorator registry + settlement hook, with
   legacy path frozen; core suite green, then mutation on core.
3. Utils adapters, one commit each, suites green after each.
4. Trace + otel packages ported v2-native, with composability suite
   (channel fidelity, sibling fan-out, filtering, settlement ordering).
5. Full-repo verification: all package suites, patois examples, react19-smoke.
6. Mutation runs for every changed package; survivors killed or annotated as
   equivalent per repo convention.
7. Docs: AGENTS.md envelope contract section, package READMEs, FUTURE.md.

## 12. Legacy retirement (the 0.19 cutover)

> **Status: executed** on the `feat/legacy-retirement` branch (0.19.0). The
> disposition table below was applied in full; the one semantic fix (step 4)
> shipped as designed — chained AppCons from channel-attached handlers now
> continue the cascade envelope via the main network's hop engine, which
> also means channel handlers observe chains produced by channel handlers
> (previously those re-entered as fresh, unmirrored cascades). A latent bug
> fell out for free: `Kernel.clone()`/`Channel.clone()` clones now actually
> dispatch handlers (the cloned networks used to lose their dispatch
> middleware; with the Network owning execution there is none to lose).

The compatibility freeze in §3 was calibrated to production constraints
that turned out not to bind: the applications surveyed during design are
out of service, and a full sweep (GitHub dependents graph, GitHub-wide code
search for `@tao.js/*` in `package.json` outside the org, per-version npm
download distribution) found **no external consumers** — download traffic
is registry mirrors and scanners. The freeze's real value is already
banked: it made the envelope migration verifiable against unmodified
tests, proving semantic preservation. Pre-1.0 minors may break, and the
1.0 foundation should not carry dual-mode dispatch.

### Release sequencing

- **0.18.0** ships this branch as-is — dual-mode, fully backward
  compatible — as insurance and as the last on-ramp for any undetected
  consumer. Its changelog announces the 0.19 removals explicitly.
- **0.19.0** (the cutover, a separate PR) removes legacy mode entirely.
  Nothing new builds on the dual-mode core: the cross-process chain
  transport and the envelope-powered routing features land after 0.19,
  on the clean foundation, followed by 1.0.

### What 0.19 removes

| surface                                                                                         | disposition                                                                                                            |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Network.setCtxControl` / `setAppCtxControl` (caller-owned `forwardAppCtx`)                     | **removed** — `enter()` is the only gate                                                                               |
| `Network.use` / `stop` (raw middleware)                                                         | **removed** — `decorate({ onDispatch })` is strictly more capable; one way to do things                                |
| `Kernel.forwardAppCtx`                                                                          | **removed** (compat-only dead code)                                                                                    |
| `Kernel.asPromiseHook`                                                                          | **removed** (pre-Network relic; Transponder/Transceiver are the replacements)                                          |
| `Kernel.channel()` unfinished sketch                                                            | **removed**                                                                                                            |
| legacy dispatch loop, `envelope.legacy` flag, NOOP-forward defaults, middleware-arity threading | **removed** with the paths that need them                                                                              |
| Tracer's unlinked-root degraded mode                                                            | **removed** (no legacy dispatches left to degrade for)                                                                 |
| adapter fail-fast version guards                                                                | **kept** (still useful against npm-history installs)                                                                   |
| all behavioral/invariant tests (§10)                                                            | **kept** — they encode semantics, not compat; only tests pinning the frozen mechanics are deleted with those mechanics |

### Cutover steps

1. **Network owns handler execution** — the keystone. `_dispatch` invokes
   the matched `AppCtxHandlers` directly; the Kernel stops registering
   dispatch middleware and becomes a thin veneer over `enter()`.
2. **Collapse to one dispatch path** — delete the legacy methods and loop;
   `enter()` + `decorate()` are the entire Network surface.
3. **Adapters become pure decorations** — Transceiver goes full-v2
   (`enter` + `onForward` mirror + `onReturn` settlement; the
   `_signals`-before-main mirror ordering pinned by an explicit test);
   Transponder's resolver and Source/Relay's observers move to
   `onDispatch` (Transponder's pre-envelope fallback branch goes); seive
   becomes a decoration; Channel deletes `forwardAppCtx` and its legacy
   `*Control` branches.
4. **One semantic fix, now that semantics are ours to set**: chained
   AppCons from **channel-attached** handlers continue the cascade
   envelope instead of re-entering with a fresh one — closing the last
   trace-root gap (§8 note) and making channel cascades fully causal.
5. **Same verification bar**: all suites green, 100% mutation on every
   touched package, the socket.io smoke (its invariants are behavioral
   and survive unchanged), spec and AGENTS.md updated to record the
   retirement.

### Non-goals of 0.19

Cross-process `envelope.chain` transport, envelope-powered routing
features, and the TypeScript surface remain separate follow-ups — 0.19 is
purely subtractive plus the one channel-chain semantic fix, to keep its
diff reviewable against this spec's table above.
