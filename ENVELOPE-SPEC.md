# Signal Envelope & Network Decoration — Design Spec

Status: **draft → implementing** on `feat/network-envelope`.
Scope: `@tao.js/core` internals, `@tao.js/utils` adapters, new `@tao.js/trace` +
`@tao.js/opentelemetry`. **Zero changes** to the app-facing TAO surface.

This is the final hardening of the JS implementation's signal plane. It also
serves as the reference model for cross-process transports and future
implementations in other languages: the envelope scopes + trigram + handler
phases defined here *are* the protocol.

---

## 1. Motivation

The Kernel/Network split was a deliberate design: `Kernel` is the consumer
surface (trigrams, three handler phases, chaining by return), `Network` is the
wiring surface (`control` envelope, `forwardAppCtx`, middleware) that exists so
adapters like `Channel` and `Transponder` can make client-server topologies
work without exposing any of it to TAO consumers. The intended end state was a
Network that adapters could **decorate additively** — non-competitively.

Decoration is already non-competitive for *observation* (`network.use()`
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

| lifetime | needed by | mechanism today |
| --- | --- | --- |
| **cascade** — one shared mutable object per cascade | `Channel.channelId`; `Transponder`/`Transceiver` `signal` + `signalled` (resolve-once **requires** shared mutation); `seive` tag | forwarder passes the same object every hop |
| **hop** — visible on the entry dispatch only | `Source.source` (echo suppression must apply to the first hop only; chained responses **must** flow back out) | falls out of plain `Kernel` *dropping* control between hops |
| **chain** — derived parent → child each hop | trace context; nothing else yet | does not exist |

Load-bearing consequence: `Kernel`'s control-drop is **not a bug** — Source
semantics (the socket.io bidirectional reflex) depend on it. `Channel`'s
control-share is also not a bug — resolve-once depends on it. The defect is
that lifetime is implicit and forwarder-defined. The redesign makes lifetime
explicit per envelope section and moves hop transitions into the Network.

External surface actually used by consumers (in-repo survey; production-app
surveys of kettleos and tidy.dev appended in §10):

- Kernel: `setCtx`, `setAppCtx`, `add*/remove*Handler`, `clone`. No in-repo
  consumer uses `asPromiseHook` (early implementation superseded by
  Transponder; frozen as-is).
- Adapters: public constructors + methods only (`Transponder.detach()`
  included). No consumer outside utils touches `setCtxControl`,
  `forwardAppCtx`, `_network`, or hand-built `control` objects.

## 3. Design overview

Three additions to `Network`, one to `AppCtxHandlers`; nothing removed:

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

### Compatibility boundary (the frozen line)

- `setCtxControl` / `setAppCtxControl` **with an explicit `forwardAppCtx`**:
  legacy mode, bit-for-bit today's behavior. The caller's forward owns the
  cascade exactly as now. Third-party code on this path is untouched.
- `setCtxControl` / `setAppCtxControl` **without a forward**: also frozen
  (forward = NOOP, chains do not propagate — today's behavior, which
  Transponder-on-Channel relies on being *supplied by Channel*, not core).
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
change (behavior preserved: suppress echo on the stamped hop only). §10
records whether any external consumer depends on per-hop reset of custom
cascade keys.

## 4. Dispatch flow (v2 mode)

```
network.enter(ac, { data, cascade, hop })
  └─ envelope = { cascade: cascade || {}, hop: hop || {}, chain: reduceChain(null, ac) }
     dispatch(ac, envelope):
       1. for each decorator with chain reducers: already applied (envelope.chain)
       2. middleware loop (kernel's handler execution, observers, legacy middleware)
          — called as (handler, ac, coreForward, envelope.cascade, envelope)
       3. handler chains AppCon `next` → coreForward(next, envelope):
          a. nextEnvelope = { cascade: envelope.cascade,        // same ref
                              hop: {},                          // reset
                              chain: reduceChain(envelope.chain, next) }
          b. for each decorator: onForward(next, nextEnvelope, { from: ac })
             — mirrors to private networks happen here (Channel._channel, …)
          c. dispatch(next, nextEnvelope)                        // exactly once
```

Ordering guarantees (pinned by tests):

- `onForward` mirrors run **before** the main-network dispatch of the chained
  AppCon (preserves Channel's current `_channel`-first ordering).
- Middleware/decorator invocation order is registration order; correctness
  must not depend on it (self-filtering by envelope keys, as all current
  adapters already do).
- Chained AppCons within one handler spool dispatch in spool order (today's
  behavior).
- Wildcard AppCons chained by handlers are dropped per the owning Kernel's
  `canSetWildcard`, exactly as `Kernel.setAppCtx` does today.

Async timing note (also today's behavior, now normative): everything after a
dispatch's synchronous middleware loop — intercept awaits, async forks,
inline spool, all chaining — resumes on microtasks. Entry stamping of an
envelope during the middleware loop is therefore race-free.

## 5. Decorator interface

```js
const dispose = network.decorate({
  name: 'channel:abc',                      // diagnostic
  onDispatch(ac, envelope) {},              // observe every dispatch
  onForward(nextAc, envelope, meta) {},     // mirror/route a chained AppCon
  onReturn(phase, value, ac, envelope) {},  // settle non-AppCtx handler returns
  chain: {                                  // per-hop reducer, namespaced
    key: 'trace',
    next(prev, ac, envelope) { return {...}; },   // prev = parent hop's value
  },
});
```

Composition laws (what "non-competitive" means, normatively):

| capability | law |
| --- | --- |
| `onDispatch` | commutes freely (pure observation) |
| envelope keys | commute iff namespaced: cascade keys owned by their adapter; chain keys by reducer namespace |
| `onForward` | commutes because mirrors are self-filtered by cascade keys and **never** re-enter main dispatch |
| `onReturn` | first-settlement-wins per entry, self-scoped by cascade key (`transceiverId`) |

`network.use()` remains supported unchanged (an `onDispatch`-only decorator
in legacy clothing).

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

| adapter | today | becomes |
| --- | --- | --- |
| `Channel` | entry stamps `channelId`; hand forward shares control, mirrors to `_channel`, re-dispatches main | `enter()` with cascade `{channelId}`; decorator `onForward` mirrors matching cascades to `_channel`; core dispatches main. Internal re-entry `(a) => this.setAppCtx(a)` replaced by envelope-preserving path — closes the channel-handler-chain gap |
| `Source` | entry stamps `source` in control; middleware suppresses echo; relies on Kernel hop-drop | `enter()` with hop `{source}`; `onDispatch` checks `envelope.hop.source` (legacy fallback: `cascade.source`). Reflex semantics identical |
| `Relay` | unexported; unbound `forwardAppCtx` bug | fixed alongside Source (same shape); stays unexported |
| `Transponder` | entry-only; control `{transponderId, signal}`; resolve-once via shared mutation; relies on wrapper (Channel) for forwarding | `enter()` on the wrapped surface with cascade `{transponderId, signal}`; `onDispatch` settles. Attached to a bare Kernel it now participates in v2 forwarding (documented improvement: chains propagate; resolve-once semantics unchanged) |
| `Transceiver` | own forward (shares control) + full dispatch fork (`captureSignal`) | `enter()` with cascade key; `onForward` mirrors to `_signals`; `onReturn` settlement; fork deleted |
| `seive` | middleware clone-and-redirect | unchanged behavior; becomes `onDispatch` + mirror using the same clone semantics |
| bridges / forward-chain / transfer / TaoLogger / trigramFilter | handler-level or pure | untouched (bridge cross-kernel envelope threading is a future option, default off) |
| koa / socket.io / router / react / http-client / examples | public APIs only | untouched; suites re-run as regression gate |

`asPromiseHook`: frozen legacy (predates Network + Transponder; no in-repo
consumers). Kept working via its existing inline-handler implementation.

## 8. Trace as the proof of decoration

`@tao.js/trace` (ported from the `feat/tao-trace` prototype) becomes a pure
decorator: `onDispatch` observer + a `chain` reducer stamping
`{ traceId, signalId, parentId }` (W3C-shaped ids). **No `instrument()`.**
Full causal fidelity for every entry surface — kernels, channels,
transponder/transceiver entries, Source entries, and channel-attached handler
chains — because every v2 hop passes through the reducer. Legacy-mode entries
(third-party `setCtxControl` with own forward) degrade to flat linkage,
never corruption. `@tao.js/opentelemetry` ports unchanged (consumes records).

## 9. Cross-process outlook (informative)

`envelope.chain` is JSON-clean by construction. A transport (socket.io, koa,
future implementations) forwards a signal across a process boundary by
serializing `{ trigram, data, chain }`; the remote `enter()` accepts a prior
chain to continue. Cascade sections are process-local by definition; hop
sections never cross. This three-scope contract — not the JS API — is what a
Go/Rust/Python implementation must honor, plus the phase semantics
(intercept-halt, async-fork, inline-spool) already documented in AGENTS.md.

## 10. Production-app survey findings

### tidy.dev (apps/clients/prototype + apps/apis/primary)

App code uses **only public APIs**: Kernel singleton, `AppCtx`,
`setCtx`/`setAppCtx` (including spread-array form `setCtx(...signal)`),
`addInline/InterceptHandler` (wildcard `{}` and partial `{a:'fail'}`
trigrams), react `Provider`/`RenderHandler`/`DataHandler`/
`useTaoInlineHandler` (whose handler chains by returning an AppCtx),
utils `forwardInline`/`forwardAsync`/`transferToAppCtx`/`transferError`/
`TaoLogger`, socket.io wiring both sides. No `control`, no underscore
access, no middleware, no `@tao.js/router` (routing is a novel
react-router-data-API integration: loaders return deferred signals,
dispatched on mount; registration is code-split per route; init chains are
guarded by intercept handlers returning truthy).

The **transitive** contract via `@tao.js/socket.io` (client `Source`,
per-socket server `Channel` + per-client wildcard `{}` inline emit handler)
yields these normative invariants — the v2 self-check list:

1. Every chained AppCon passes network middleware on **every hop** (the
   client Source's emit middleware must see chained signals, or
   client→server forwarding of `app/init → app/load → app/view` breaks).
2. Channel-entered cascades retain `channelId` scoping **end-to-end**
   (per-client reply routing; loss = silent request/response death,
   over-broadcast = cross-client data leak).
3. Kernel-entered cascades remain **unscoped** (empty cascade must never
   acquire channel/source tagging, or server-internal chains like
   `app/init ⇒ keycloak/*` would be emitted to connected clients).
4. Descendants of a **server-received** signal must be re-emitted to the
   server (Source's `source` marker applies to the stamped hop only —
   hop scope, not cascade scope).
5. Intercept-halt (truthy return) suppresses the signal for **all** later
   phases including wildcard `{}` inline handlers (the socket emit path).

Additional constraint: the app's lockfile runs **core 0.16.0 with
utils/socket.io 0.16.2** — mixed patch versions are a real deployment
pattern. v2 utils adapters call `network.enter()`/`decorate()`, which old
cores lack; therefore utils (and socket.io/koa via utils) must declare a
**peerDependency floor on the new core version**, and adapters should
fail fast with a clear error when attached to a pre-envelope core rather
than misbehave.

### kettleos (all @tao.js/* pinned 0.15.0; 306 files import core across 11 apps)

App code is **exclusively public API**: no `control`, no middleware, no
underscore access, no monkey-patching, no deep internal imports (only
`@tao.js/react/lib` — a public re-export path that must stay resolvable).
Load-bearing surface: handler add/remove at scale (565 inline / 251
intercept / 135 async sites), `setCtx`/`setAppCtx` fire-and-forget,
wildcard + partial + **array** trigrams, 4-arg and 6-arg `AppCtx`,
`unwrapCtx()` round-tripped into registration, `instanceof AppCtx` checks,
full react surface, socket.io both sides. `Channel` constructed **per
Express request on the same global kernel** the socket bridge wires;
`Transceiver(TAO, false, 100)` in batch scripts awaits multi-hop chains
(`script → set → … → finish`) and tears down with `remove*Handler`.
`asPromiseHook`, `Transponder`, `Source`, `seive`, bridges: never used
directly. (The repo also contains three name-colliding *reimplementations*
of utils' forward-chain/TaoLogger built on public API only.)

Normative invariants added by this survey:

6. **Handler-return semantics and phase order are the fleet's backbone**:
   intercept AppCtx-divert suppresses remaining handlers; intercept truthy
   halts; intercept undefined observes; inline/async AppCtx chains — all
   preserved exactly, including wildcard-intercept loggers firing first.
7. **Chain affinity is implicit and must be exact**: a cascade entered on a
   per-request Channel keeps that channel's scoping for all hops; a
   kernel-entered cascade never acquires scoping. (Same as invariants 2–3,
   independently confirmed.) The Transceiver's cascade tag must survive
   multi-hop `forwardInline` chains for its awaited promise to settle.
8. **No added macrotask hops in dispatch**: chained dispatch stays on the
   same synchronous/microtask schedule as today — batch scripts drain
   pending async work with a single `setImmediate` between iterations, and
   UI code assumes inline completion ordering. The v2 hop engine must not
   defer forwarding beyond where the legacy closures ran.

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
