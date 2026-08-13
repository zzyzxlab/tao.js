# VISION.md — the forward view

Where TAO is going and why the sequencing is what it is. Companion to:

- [`TAO-SPEC.md`](./TAO-SPEC.md) — the TAO Paradigm (normative)
- [`MESH-SPEC.md`](./MESH-SPEC.md) — the TAO Mesh Profile (normative, draft for 1.0)
- [`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) — the JS implementation's signal-plane design record
- [`AGENTIC.md`](./AGENTIC.md) — why TAO fits agentic programming, and the tooling checklist
- [`FUTURE.md`](./FUTURE.md) — the working task list
- [`AGENTS.md`](./AGENTS.md) — how to work on this repo

This document captures three horizons: the **0.20.0 release** (committed
scope), the **mesh** (the architectural end-state), and the **thesis**
(what TAO actually is, and what 1.0 should mean). Later horizons justify
earlier ones; nothing in a later horizon is scheduled work.

---

## 1. 0.20.0 — the wire release (implemented on `feat/chain-transport`)

> **Status:** shipped as specified — every §1 deliverable below is
> implemented, spec'd ([`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) §4/§5/§9), and verified (17 test
> projects, 100% coverage and 100% mutation on all 13 published packages,
> 13/13 socket.io round-trip smoke incl. one-traceId proof).

0.19.0 left one dispatch surface: `enter()` + `decorate()`. 0.20.0 extends
the envelope across process boundaries so a cascade spanning processes is
one cascade, not several that happen to look alike.

### What ships

1. **Native `envelope.chain` transport** in `@tao.js/socket.io` and
   `@tao.js/koa`. Socket.io serializes the chain with each signal and the
   receiving side re-enters with `enter(ac, { chain })`, so reducers
   continue instead of restarting — one `traceId`, correct parentage,
   across a client→server→client round trip (today that produces three
   disjoint traces). Koa maps the chain to/from W3C `traceparent` headers,
   so browsers and APM tooling interoperate.
2. **Boundary primitives + duplex helper.** The envelope boundary-crossing
   logic is identical in every correct transport and silently wrong in
   every incorrect one, so it gets codified by construction:
   - primitives every transport composes: pack the portable part of an
     envelope for the wire; enter a network with a received chain plus the
     transport's own hop marker;
   - a duplex convenience helper (Source-shaped: sockets, queues) built on
     the primitives, roughly `createTransport({ name, send, onReceive })` —
     emit `{ trigram, data, chain }` unless `envelope.hop.source === name`
     (echo suppression), enter with `{ hop: { source: name }, chain }` on
     receive.

   Transport logic — connection lifecycle, per-client Channel routing,
   auth, request/response correlation, delivery semantics — **stays in
   each transport**. Request/response transports (koa) compose the
   primitives directly; the helper is a convenience for the duplex shape,
   not a framework.

3. **Transport conformance kit (TCK).** The §10 invariants, phrased
   per-edge as an executable suite. An implementer supplies a factory
   producing a connected pair (`{ a, b, close }`, loopback is fine); the
   kit verifies:
   - delivery: a signal entered on A reaches handlers on B, datagram
     intact;
   - bidirectional reflex: the arriving signal is not echoed back, but
     descendants chained on B are emitted to A (invariant 4 — the one
     hand-rolled transports get wrong most often);
   - multi-hop emission: every hop of a chain crosses, not just the entry
     (invariant 1);
   - **chain continuity: Tracers on both ends, one cascade A→B→A, a
     single `traceId`, and B's entry parent-linked to A's emitting hop** —
     the tracing guarantee stated as a test instead of a doc sentence;
   - scoping: kernel cascades stay unscoped across the wire; reply
     routing (channel affinity) is an optional capability tier a
     transport declares.

   Framework-agnostic (no jest dependency — structured results consumable
   from any runner), in the tradition of abstract test suites.

4. **`hop.via` — phase tagging on chained hops.** Chained hops carry which
   handler phase produced them: `hop: { via: 'Intercept' | 'Async' |
'Inline' }` (entry hops keep their caller-supplied hop; no `via`). The
   information already exists at the three chain-origin call sites in
   `AppCtxHandlers._handlePhases` and is currently discarded; it is hop
   data because it describes the edge between parent and child —
   single-hop lifetime, not cascade-shared. Tracer records gain `via`,
   `InMemorySink.format()` annotates tree edges, the OTel sink maps it to
   an attribute. Symmetry note: `onReturn` already reports the phase of
   non-AppCtx returns; `hop.via` reports the phase of AppCtx chains.
5. **§9 goes normative.** The wire envelope becomes a versioned,
   self-describing contract: `{ tao, data, envelope: { v, chain } }` plus
   the transport's own routing metadata in the transport's own protocol.
   This is also the document the Go implementation builds from.

### Design constraints (settled; do not relitigate without a spec change)

The envelope's three scopes were taxonomized by lifetime **and locality**;
"send the whole envelope" collapses the taxonomy:

| scope     | crosses the wire? | why                                                                                                                                                                                                                                                                                                                                   |
| --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cascade` | **never**         | holds live function references (Transponder/Transceiver signal resolvers — capabilities bound to local memory) and process-local affinity (`channelId` counters are per-process; copying imports foreign scoping, violating invariant 3). Cross-process affinity is the transport's job to **translate** into its own terms, not copy |
| `hop`     | **never**         | boundary-local by definition; the receiver stamps its **own** `source` marker so its own echo suppression works                                                                                                                                                                                                                       |
| `chain`   | **yes**           | designed for it: derived, JSON-serializable, namespaced; the receiver re-reduces with **its** registered reducers, so unknown keys degrade gracefully                                                                                                                                                                                 |

Also settled: `control`/cascade is app-extensible, so defaulting to
"ship it all" is a state leak; the explicit wire contract is the security
boundary. Escape hatch (build nothing until a real transport asks):
selective cascade **translation** as an explicit opt-in allowlist of
serializable tags — never the default.

### Verification bar

Same as 0.18/0.19: spec-first (amend [`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) §4 for `hop.via`
and §9 for the wire contract before implementing); the built-in socket.io
and koa transports are implemented **on** the boundary primitives and are
the **first two TCK consumers** (if the built-ins can't be expressed
through the helper or don't pass the kit, the abstraction is wrong and we
find out immediately); 100% coverage and 100% mutation on touched
packages; the cross-process smoke extended to assert one `traceId` per
round trip.

### Honest caveats (documented, not solved, in 0.20)

- Each process records its own trace hops; a shared `traceId` makes
  records joinable but seeing one tree requires sink convergence — which
  is what `@tao.js/opentelemetry` is for (both ends export to one
  collector; remote-parent linkage already handled).
- A custom transport must adopt the primitives or pass the TCK; the chain
  does not carry itself. Manual `traceparent` continuation remains the
  escape hatch.
- `hop.via` does not cross the wire (hop is boundary-local); the edge that
  produced a server-side continuation **is** the transport, and each
  record describes its own edge — an assembled cross-process trace loses
  nothing.
- `via` is phase, not handler identity. Which of three inline handlers
  chained a given AppCon is a separate question that belongs to the
  protocol-extractor work ([`AGENTIC.md`](./AGENTIC.md)), not the envelope.

---

## 2. The mesh (the architectural end-state; specified, not scheduled)

> **Status: specified.** The design record that used to live here — home
> authorities, a sequential distributed veto, CAP-driven partition
> postures — was superseded by the 1.0 spec sessions: it had read the JS
> engine's serialized implementation back into the paradigm. The
> corrected contract lives in [`MESH-SPEC.md`](./MESH-SPEC.md) (the mesh floor + the
> capability vocabulary) and [`TAO-SPEC.md`](./TAO-SPEC.md) (the paradigm — datum
> contract, phase contract, dispatch lifecycle — extracted standalone for
> 1.0). What follows is the summary and the analysis that survives.

### What maps cleanly (unchanged)

Trigram listeners + wildcards across a dynamic mesh is **subject-based
routing** — a solved problem. A trigram is a point in the app's declared
Space; a wildcard handler is a slice; membership dynamics are interest
propagation. TAO's fixed three-token grammar makes this cheaper than
general pub/sub, not harder ([`MESH-SPEC.md`](./MESH-SPEC.md) Appendix B: dispatch in at
most 8 probes).

### The phases encode locality — corrected

| phase     | across a mesh                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ASYNC     | distribution-native: open interest, delivery per declared policy, completion unobservable. Zero contract loss                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| INLINE    | **enrollment**: registered bindings, counted and waited on; `dispatched`/`settled` are exact over a per-dispatch snapshot. Execution may live anywhere (invocation edges); timing was never contract                                                                                                                                                                                                                                                                                                                                                              |
| INTERCEPT | **not the crux it appeared to be.** The paradigm contract is an unordered verdict gather with conditional completeness ([`TAO-SPEC.md`](./TAO-SPEC.md) §3): proceed needs the complete all-falsey set; halt is decisive on partial verdicts. Verdict combination is commutative, so fan-out is legal by construction — no global sequencer, no leases, no consensus store. What remains of CAP: passage requires reachability of the gate snapshot — fail-closed by construction, with postures declared per placement unit ([`MESH-SPEC.md`](./MESH-SPEC.md) §9) |

The earlier "sequential, awaited veto = CP" analysis mistook the JS
engine's serialized loop for paradigm. The paradigm's intercept contract
was always outcome-shaped — truthy halts, AppCon redirects, falsey
proceeds — and pinning that precisely is what dissolved the
distributed-veto problem. Global observation belongs to decorations
either way: the Tracer-as-decoration + collector pattern remains the
mesh-ready answer.

### Standing advice (updated)

1. **Don't write membership, gossip, or routing.** Bind the floor to an
   existing substrate ([`MESH-SPEC.md`](./MESH-SPEC.md) §11 sketches subject brokers, FaaS,
   and blends). TAO's contribution is the phase contract and the
   product-language protocol, not transport plumbing.
2. The invention budget went where it belonged: the **capability
   vocabulary and the requirements⊆capabilities placement rule**
   ([`MESH-SPEC.md`](./MESH-SPEC.md) §10) — the successor of the "guarantee-placement
   table" idea, with declared postures instead of a prescribed one.
3. **The app's TAO — its declared Space and Protocols — is the routing
   surface, placement input, and lint target** ([`MESH-SPEC.md`](./MESH-SPEC.md) §§3–4);
   the extractor ([`AGENTIC.md`](./AGENTIC.md)) generates its skeleton.
4. The Go implementation ([`FUTURE.md`](./FUTURE.md)) stops being a port and becomes a
   mesh node by implementing [`TAO-SPEC.md`](./TAO-SPEC.md) (wire, phases, lifecycle) plus
   [`MESH-SPEC.md`](./MESH-SPEC.md)'s invocation edges, then passing the kits — with a
   cross-language TCK run as the induction proof ([`MESH-SPEC.md`](./MESH-SPEC.md) §12).

### Effect on 0.20 (unchanged)

Scope: none. 0.20 **is** the first mesh edge — a two-node mesh with
static membership. Its wire contract and TCK survive the respecification
untouched: mesh-wide guarantees are obtained by induction over edges, and
0.20's edges are the induction step.

---

## 3. The thesis (what TAO is; what 1.0 means)

### Orthogonality, stated precisely

The TAO Paradigm codifies a contract that lets **Business Logic evolve
orthogonally to the Architectural Logic underneath**. You start
client-server and migrate to a mesh without changing any declared
Protocol (chain of trigrams). That is not an aspiration; it is now an
observed property at small scale: the 0.19 cutover replaced the entire
dispatch engine (middleware → direct execution) and every consumer
package held 100.00% mutation score with **zero edits** — 959
consumer-package mutants whose kills survived an architecture swap
because the behavior was expressed against the contract, not the
machinery. The paradigm's own history has the same signature:
Kernel→Network was an architecture swap under the TAO interface; the
envelope was an architecture swap under the adapter semantics.
Client-server → mesh is the same move with a longer lever arm.

### The refinement that keeps the claim rigorous

Orthogonality is only as real as the contract is precise about **which
guarantees are paradigm and which are accidents of a deployment** (the
[`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) §10 scope split's terms):

- **paradigm-level** (every architecture must honor them): chains, the
  intercept veto, cascade scoping, handler-return/phase-order semantics;
- **implementation-level** (the current architecture happens to make
  them): invariant 8 — no added macrotask hops. An app whose business
  logic quietly depends on same-tick inline completion will notice the
  mesh even though its trigram chains never change.

The instrument that makes this distinction explicit is now twofold:
[`TAO-SPEC.md`](./TAO-SPEC.md) (the paradigm stated standalone, with [`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md)
§10's scope split recording which of this engine's guarantees are
surplus) and the capability model in [`MESH-SPEC.md`](./MESH-SPEC.md) §10 (requirements
declared per placement unit, checked by containment against what an
architecture declares). Contracts that skip this become fiction the
first time the architecture moves.

### TAO as a meta-framework

TAO hands application builders a **grammar** — three tokens, three
phases, chaining — and no vocabulary. Every TAO app is its own
application-DSL-based framework: the working language of a team is its
trigram chains, a DSL that exists nowhere else. This explains the two
facts that otherwise look like problems: TAO has few "features" (the app
supplies the vocabulary), and it was hard to teach (nobody can write
generic tutorials for _your_ language). The meta-framework bet
front-loads a cost — authoring and teaching an app language — that human
teams were the wrong buyers for. Agents re-price it: they can't lean on
framework-shaped training data inside a TAO app anyway, but they can
load an enumerable, greppable vocabulary in one context window. The cost
center becomes nearly free; the benefit — the domain evolving against a
stable grammar — compounds.

Meta-frameworks keep bad company (internal-DSL sprawl, inner-platform
effects, executable-model drift). TAO counters each cause of death by
design:

1. **The grammar is fixed and tiny.** Teams author vocabulary, never
   grammar — so tooling (extractor, tracer, TCK) works on every TAO app
   unmodified, and app DSLs cannot diverge into idiolects.
2. **The substrate is contract-bound, not hidden.** Inner platforms leak
   because they pretend the layer below doesn't exist; TAO's layer below
   is explicitly swappable because the contract names exactly what it
   guarantees.
3. **The drift loop is closed at runtime.** The classic DSL death is the
   spec becoming a lie. A TAO app's declared Protocols and its observed
   chains are checkable against each other every time a cascade runs
   through a sink.

The remaining [`AGENTIC.md`](./AGENTIC.md) items are the meta-framework completing
itself: the extractor gives each app-DSL its generated reference,
`TAO.md` its documentation artifact, typed vocabularies its compiler
errors. At that point every TAO app is a first-class framework that
happens to have been authored by naming trigrams.

### What 1.0 means

1.0 is not "the JavaScript implementation is finished." 1.0 is **the
contract is specified tightly enough to hold through architecture swaps
that haven't happened yet**: [`TAO-SPEC.md`](./TAO-SPEC.md) (the paradigm — grammar,
datum contract, phase contract, lifecycle, scopes, wire, invariants),
the [`MESH-SPEC.md`](./MESH-SPEC.md) floor with its capability vocabulary, and
[`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) §10's scope split recording what is engine surplus. The JS packages are one
deployment of that contract; the Go library is the second; the mesh is
the third. The core is the grammar, the tooling makes each app's
language feel native, and the architecture underneath — kernel, socket,
mesh — is deliberately nobody's business but the operator's.

### The release ladder

| release | delivers                                                                                            | status                         |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------------ |
| 0.18.0  | envelope + decorations, dual-mode (insurance), telemetry/otel, routing                              | shipped                        |
| 0.19.0  | legacy retirement: one dispatch surface ([`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) §12)              | shipped                        |
| 0.20.0  | the wire: chain transport, primitives + TCK, `hop.via`, §9 normative                                | shipped                        |
| 0.21.0  | types train: d.ts for all 13 packages + deprecation removals                                        | shipped                        |
| 0.2x    | routing add-ons (loader-await, per-navigation Channels, SSR→hydration)                              | open                           |
| 1.0     | the contract + its proofs — incl. [`TAO-SPEC.md`](./TAO-SPEC.md) + [`MESH-SPEC.md`](./MESH-SPEC.md) | when the contract stops moving |
