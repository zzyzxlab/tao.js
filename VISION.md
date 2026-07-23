# VISION.md — the forward view

Where TAO is going and why the sequencing is what it is. Companion to:

- `ENVELOPE-SPEC.md` — the signal-plane contract (normative)
- `AGENTIC.md` — why TAO fits agentic programming, and the tooling checklist
- `FUTURE.md` — the working task list
- `AGENTS.md` — how to work on this repo

This document captures three horizons: the **0.20.0 release** (committed
scope), the **mesh** (the architectural end-state), and the **thesis**
(what TAO actually is, and what 1.0 should mean). Later horizons justify
earlier ones; nothing in a later horizon is scheduled work.

---

## 1. 0.20.0 — the wire release (committed scope)

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
   self-describing contract: `{ v, trigram, data, chain }` plus the
   transport's own routing metadata in the transport's own protocol. This
   is also the document the Go implementation builds from.

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

Same as 0.18/0.19: spec-first (amend `ENVELOPE-SPEC.md` §4 for `hop.via`
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
  protocol-extractor work (`AGENTIC.md`), not the envelope.

---

## 2. The mesh (the architectural end-state; not scheduled)

The thought experiment: AppCon signals fired into a mesh that exists
dynamically across many nodes, protocol chains defined app-side, signals
finding their handlers wherever they live — under the full TAO contract:
trigram listeners, wildcards, and the INTERCEPT/ASYNC/INLINE guarantees.

### What maps cleanly

Trigram listeners + wildcards across a dynamic mesh is **subject-based
routing** — a solved problem (NATS subjects, MQTT topics, AMQP topic
exchanges). A trigram is a three-token subject; wildcard handlers are
wildcard subscriptions; membership dynamics are interest propagation.
TAO's fixed three-token address space makes this cleaner than general
pub/sub, not harder.

### What fights back: the phases encode locality

| phase     | across a mesh                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ASYNC     | distribution-native: a fork with no ordering/timing obligation. A remote async handler is just a subscriber. Zero contract loss                                                                                                                                                                                                                                                                                                                                    |
| INLINE    | loses its timing, keeps its ordering: "same execution context, no added macrotask hops" is definitionally unsatisfiable over a network; "ordered, awaited, settled — on network time" survives as an explicitly weaker tier                                                                                                                                                                                                                                        |
| INTERCEPT | **the crux**: a global, _sequential_, awaited veto before any other phase fires anywhere. Distributed literally = a synchronous barrier across every node holding a matching pattern (including wildcards), per dispatch, unparallelizable (order matters). A partitioned node holding a `{*,*,*}` intercept either blocks the mesh or the veto silently stops being a veto. Veto semantics are CP; always-dispatch is AP — this is CAP, not an engineering detail |

### The design shape that resolves it

**Route signals to guarantees instead of stretching guarantees across
nodes.** Give every trigram (or Term) a _home_ — an authority node — and
execute the full three-phase contract there, exactly as local TAO, on the
already-verified dispatch engine. Other nodes hold async subscriptions
and produce chain continuations. A handler on node A chaining a trigram
whose home is node B is an inter-node hop carrying the chain scope —
**which is precisely the 0.20 wire contract**. The mesh is then layers
above 0.20's edges:

- interest propagation (which trigram patterns live where);
- home placement and failover (trigram as the natural sharding key —
  queue-group-style takeover);
- delivery policy (realistically at-least-once + idempotent handlers);
- partition policy (what the veto means during a partition — declared,
  not discovered).

This is the virtual-actor / Erlang shape: single writer per subject,
strong guarantees at the owner, async messaging between owners. Global
observation belongs to decorations, not intercepts: a wildcard intercept
is the mesh anti-pattern, while the Tracer-as-decoration + collector
pattern (local recording, converged aggregation) is already the
mesh-ready answer.

### Standing advice for when it's built

1. **Don't write membership, gossip, or routing.** Build the TAO
   semantics layer on an existing subject-routing substrate (NATS maps
   almost 1:1). TAO's contribution is the phase contract and the
   product-language protocol, not transport plumbing.
2. **Spend the invention budget on the guarantee-placement spec**: a
   table stating which invariant holds where (home-node / edge /
   mesh-wide), written before code — the same §10 discipline. This table
   is what keeps "migrate without changing the protocol" honest.
3. `TAO.md` + the protocol extractor (`AGENTIC.md`) double as the mesh's
   interest schema — the app's declared protocol is literally the routing
   table.
4. The Go implementation (`FUTURE.md`) stops being a port and becomes a
   mesh node the moment §9 + the placement table exist.

### Effect on 0.20

Scope: none. 0.20 **is** the first mesh edge — a two-node mesh with
static membership. The only mesh-readiness requirements are already in
the 0.20 plan: a versioned self-describing wire envelope, and TCK
invariants phrased per-edge so a future mesh link is just another
TCK-passing transport.

---

## 3. The thesis (what TAO is; what 1.0 means)

### Orthogonality, stated precisely

The TAO Paradigm codifies a contract that lets **Business Logic evolve
orthogonally to the Architectural Logic underneath**. You start
client-server and migrate to a mesh without changing any prescribed
protocol chain of trigrams. That is not an aspiration; it is now an
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
guarantees are protocol and which are accidents of deployment**:

- **protocol-level** (every architecture must honor them): chains, the
  intercept veto, cascade scoping, handler-return/phase-order semantics;
- **deployment-level** (the current architecture happens to make them):
  invariant 8 — no added macrotask hops. An app whose business logic
  quietly depends on same-tick inline completion will notice the mesh
  even though its trigram chains never change.

The guarantee-placement table (§2) is the instrument that makes this
distinction explicit. Contracts that skip it become fiction the first
time the architecture moves.

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
   spec becoming a lie. A TAO app's declared protocol and its observed
   chains are checkable against each other every time a cascade runs
   through a sink.

The remaining `AGENTIC.md` items are the meta-framework completing
itself: the extractor gives each app-DSL its generated reference,
`TAO.md` its documentation artifact, typed vocabularies its compiler
errors. At that point every TAO app is a first-class framework that
happens to have been authored by naming trigrams.

### What 1.0 means

1.0 is not "the JavaScript implementation is finished." 1.0 is **the
contract is specified tightly enough to hold through architecture swaps
that haven't happened yet**: the §10 invariants, the §9 wire contract,
and eventually the guarantee-placement table. The JS packages are one
deployment of that contract; the Go library is the second; the mesh is
the third. The core is the grammar, the tooling makes each app's
language feel native, and the architecture underneath — kernel, socket,
mesh — is deliberately nobody's business but the operator's.

### The release ladder

| release | delivers                                                               | status                         |
| ------- | ---------------------------------------------------------------------- | ------------------------------ |
| 0.18.0  | envelope + decorations, dual-mode (insurance), telemetry/otel, routing | shipped                        |
| 0.19.0  | legacy retirement: one dispatch surface (`ENVELOPE-SPEC.md` §12)       | built — PR #60                 |
| 0.20.0  | the wire: chain transport, primitives + TCK, `hop.via`, §9 normative   | next (§1 of this doc)          |
| 0.2x    | routing add-ons (loader-await, per-navigation Channels, SSR→hydration) | after the wire                 |
| 1.0     | the contract + its proofs (see above)                                  | when the contract stops moving |
