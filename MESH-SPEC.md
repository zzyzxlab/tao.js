# MESH-SPEC.md — The TAO Mesh Profile

Status: **draft for 1.0** — spec only; nothing here schedules implementation.
Companion to:

- [`TAO-SPEC.md`](./TAO-SPEC.md) — the paradigm layer: the
  [grammar (§1)](./TAO-SPEC.md#1-the-grammar), the
  [datum contract (§2)](./TAO-SPEC.md#2-the-datum-contract), the
  [phase contract (§3)](./TAO-SPEC.md#3-the-phase-contract), the
  [dispatch lifecycle (§4)](./TAO-SPEC.md#4-the-dispatch-lifecycle), the
  [observation plane (§5)](./TAO-SPEC.md#5-the-observation-plane), the
  [envelope scopes (§6)](./TAO-SPEC.md#6-the-envelope-scopes), the
  [wire contract (§7)](./TAO-SPEC.md#7-the-wire-contract), the
  [invariants (§8)](./TAO-SPEC.md#8-invariants)
- [`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) — the design record of the JavaScript implementation's
  signal plane (engine architecture, adapter contracts, engine-level
  guarantees)
- [`VISION.md`](./VISION.md) — the horizons;
  [§2](./VISION.md#2-the-mesh-the-architectural-end-state-specified-not-scheduled)
  records how this spec superseded the earlier mesh sketch
- [`AGENTIC.md`](./AGENTIC.md) — why the declared artifact doubles as agent context
- [`packages/tao-transport-tck`](./packages/tao-transport-tck) — the
  executable form of the propagation-edge contract

This document specifies what a **mesh** — TAO dispatch spanning many nodes,
processes, languages, and execution substrates — must guarantee, stated so
that every implementation can honor the guarantees and none can silently
weaken them.

**Scope rule, governing the entire document: this spec specifies
_communication_ guarantees only.** Where handlers execute, how invocations
are retried, how nodes discover each other, which wire format an edge speaks
— those belong to implementations and are **declared as capabilities** (§10).
Execution is delegated; communication is contract.

---

## 0. How to read this spec

Every contract section ends with a **Plainly** block: the same contract in
the words a developer needs while writing code. Both forms are normative;
the formal text governs if they ever disagree, and any disagreement is a
spec bug to fix.

MUST / MUST NOT / MAY carry their RFC 2119 meanings.

---

## 1. The three layers

1. **The paradigm** ([`TAO-SPEC.md`](./TAO-SPEC.md)): the grammar and its semantics —
   trigrams, the datum contract, the three handler phases, the dispatch
   lifecycle, the envelope scopes, the wire contract, the invariants. Every
   implementation at every scale honors this layer. A single-process kernel
   is already a complete implementation of it.
2. **The mesh floor** (this document): the communication guarantees that make
   many dispatch scopes behave as one signal network — edges (§7), signal
   identity and delivery (§8), the distributed phase semantics (§5), the
   partition rules (§9).
3. **Implementations**: bind the floor to substrates (a subject broker, a
   FaaS platform, an in-process loop) and **declare capabilities** on top —
   delivery modes, ack anchors, postures, codecs, settlement extensions
   (§10). Apps declare requirements in their TAO; a deployment is valid iff
   every requirement is met by a declared capability.

### The failure contract

When handler execution fails, the mesh owes exactly two things:

- **Isolation** — a handler failure MUST NOT corrupt dispatch and MUST NOT
  affect sibling invocations.
- **Legibility** — the failure MUST be observable, attributed to its owner,
  and carry its chain identity.

It owes no recovery. Retry belongs to execution substrates and declared
capabilities. There are two distinct retry layers an implementation MUST
keep separate: **signal redelivery** (communication — governed by §8) and
**invocation retry** (execution — governed by the substrate); an
implementation MUST NOT stack them blindly.

> **Plainly** — TAO's rules of meaning are one layer; "many machines, one
> network" is a second; everything else an architecture gives you is a
> declared extra. If your app only asks for what the layers promise, it runs
> anywhere those layers do. If it needs an extra, it says so in its TAO, and
> tooling checks the ask against what the architecture declares. If your
> handler crashes, that's yours — the mesh makes the crash visible and
> contained, never fixed.

---

## 2. Terms of art

| term                          | meaning                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Space**                     | Everything an app can say: declared by its three axes — Terms, Actions, Orient(ation)s — and containing every trigram they span |
| **axis**                      | One of the three declared sets (Terms, Actions, Orients)                                                                        |
| **point**                     | A trigram — coordinates `(t, a, o)` in the Space                                                                                |
| **slice**                     | The set of points matched by a wildcard pattern (fix some axes, range the rest)                                                 |
| **Protocol**                  | A named, declared path of signals through the Space that accomplishes a goal; may branch                                        |
| **chain** (runtime)           | What actually happens: handlers chaining AppCons at runtime. Protocols are declared; chains happen                              |
| **the app's TAO**             | The declared artifact — the Space plus its Protocols — documented in `TAO.md`, distributable as a package                       |
| **declared mode / open mode** | Whether the app's vocabulary is closed (every pattern in the TAO) or emergent at runtime                                        |
| **dispatch scope**            | The registry + engine a signal dispatches in (a Kernel/Network today; any conformant engine tomorrow)                           |
| **enrollment**                | Registration of an intercept or inline binding in a dispatch scope's registry — counted, waited on                              |
| **interest**                  | An async subscription — open membership, never counted                                                                          |
| **binding**                   | A registered handler reference: an in-process function, a FaaS ref, a queue subject — executable over an invocation edge        |
| **propagation edge**          | A link carrying signals between dispatch scopes ([`TAO-SPEC.md` §7](./TAO-SPEC.md#7-the-wire-contract))                         |
| **invocation edge**           | A link carrying one handler invocation and its return (§7)                                                                      |
| **placement unit**            | The granularity at which requirements attach: a declared slice of the Space (often per-Term, not necessarily)                   |
| **projection**                | A deterministic map from trigram coordinates to a partition of the Space, used by implementations that shard dispatch           |
| **posture**                   | A declared partition behavior (§9)                                                                                              |

---

## 3. The Space and the app's TAO

A Space is declared by listing its three axes independently. The Space is
what they span: every point `(t, a, o)` with `t ∈ Terms`, `a ∈ Actions`,
`o ∈ Orients`. The Space is deliberately a superset of what the app
exercises — declaring an axis token does not promise every combination is
meaningful; it promises the token is part of the language.

Three tiers of legality follow, each with defined semantics:

1. **On-Protocol** — the signal lies on a declared Protocol path: expected
   behavior; responses, expectations, and optimizations attach here (§4).
2. **In-Space, off-Protocol** — expressible but undeclared: legal,
   dispatched normally, observable — and the raw material of drift
   detection (§4).
3. **Out-of-Space** — not in the language. In declared mode this is a
   vocabulary violation: a typo is caught here — at minimum by lint and
   trace, by type error where typed vocabularies are in use, and a mesh MAY
   refuse to route it. It is never silently a no-op.

**Declaration is not registration.** Registration — which handlers are
enrolled or interested right now — is dynamic in every mode, with snapshot
semantics per dispatch (§5). Declaration closes the vocabulary, never the
registry. A declared point with zero registered handlers is legal: the
signal concludes, dispatches to nobody, settles trivially, and the trace
shows an observable no-op.

**Declared mode is opt-in, like a package.** The app's TAO is a versioned
artifact — documented in `TAO.md`, installable as a dependency — that the
app, its tooling, the mesh, and agents all consume. Its value to the
developer, in order:

1. A living protocol document — "what does this app do?" is a file.
2. Domain evolution through source control — a change to the business
   language is a reviewable, diffable PR.
3. Compact agent context — the app's whole working vocabulary loads in one
   context window.

The mesh consuming the same artifact — as its routing surface, placement
input, and lint target — is a consequence of declaring, not a separate
task.

> **Plainly** — Your app's TAO is two declarations: the **Space** — every
> Term, Action, and Orient your app can say — and your **Protocols** — the
> named paths through that Space that mean something. Signals off a Protocol
> are legal; signals outside the Space are typos. Could you write down every
> signal your app sends? If yes, write them down — that document becomes
> your docs, your types, your routing table, and your lint target for free.
> If you can't, everything still works; nothing can be checked.

---

## 4. Protocols

A **Protocol** is a named, declared path of signals through the Space that
accomplishes a goal — the same sense the word carries in networking: a
series of messages that, exchanged in order, get something done.

- A Protocol MAY branch: success and failure paths, alternative responses.
  Formally it is a small graph of signal transitions with entry points, not
  only a line.
- A request point MAY declare its response point(s). Declared responses are
  the sanctioned request/response surface: wrappers await _declared_
  responses (deterministic), never "whatever chains first" (a race).
- **Protocols are declared; chains happen.** The runtime mechanism keeps
  the word "chain" (`envelope.chain`, chained AppCons — unchanged, settled
  0.20 naming). Drift detection is the comparison: observed chains checked
  against declared Protocols, within the declared Space. The drift loop is
  closed at runtime because every cascade is observable at the dispatch
  plane.
- Ordering of business steps is expressed **only** by Protocols — signals
  chained through the Space — never by handler registration order (§5, and
  [`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract)). Restructuring an ordering into a Protocol makes
  the intermediate signal visible: wildcards match it, observers see it,
  traces record it. That visibility is the point — precedence becomes
  documented protocol instead of hidden mechanics.

> **Plainly** — A Protocol is a story your app tells in signals: "this,
> then this, then one of these." You write the stories down; the runtime
> chains are checked against them. If step B must follow step A, that's a
> Protocol — two signals chained — not two handlers racing on one signal.

---

## 5. The phase contract at mesh scale

The paradigm phase contract is [`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract) and is not restated
here; this section specifies what distribution adds. One universal priority
exists — Intercept → Async → Inline — and no other priority mechanism ever
will; its portable content (gate, then commit async delivery, then execute
and settle inline — a commitment ordering, not a scheduling promise) and
the rejection of prioritized handlers are both paradigm-level
([`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract)).

### 5.1 Intercepts: the distributed gather

The intercept set for a dispatch is the **snapshot** of gates registered in
the dispatch scope at dispatch time — local functions and remote bindings
alike. The dispatch gathers verdicts under conditional completeness
([`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract)):

- **Proceed requires the complete verdict set, all falsey.** A dispatch
  MUST NOT proceed on partial verdicts — no posture, capability, or
  partition state can license skipping a snapshotted gate. This is the
  veto-skip prohibition and it has no exceptions.
- **Halt is decisive on partial verdicts.** One truthy concludes the
  dispatch as halted even while other gates are unreached or unreachable.
- **Fail-closed asymmetry, for free:** under partition, a reachable gate
  can still veto; passage requires full connectivity to the gate set. What
  a dispatcher does about an unreachable gate — fail, queue, block — is its
  declared posture (§9).
- **Fan-out is legal by construction.** Verdict combination is commutative
  and associative, so evaluation order and parallelism are unobservable
  (Appendix A). Gate invocations MAY be concurrent, scatter-gathered, or
  serialized — the outcome is identical for contract-conformant gates.
- **Redirect at mesh scale** is unchanged from [`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract):
  decisive-as-forward.
  The replacement signal enters as a new dispatch and faces its own
  complete intercept phase wherever it dispatches. A concurrent
  truthy-vs-AppCon race MUST resolve deterministically **within a
  dispatch**; the implementation declares its tiebreak. (Across
  _duplicate_ dispatches no such promise exists — gates read live state
  and may legitimately answer differently; see §8.) Tooling MUST be able
  to lint overlapping redirect-capable patterns (statically derivable
  from the app's TAO).
- **A gate invocation failure is a missing verdict, never a falsey.**
  Errors block proceed (posture applies); errors are never passes.

### 5.2 Inline: enrollment

Inline participation is **enrollment**: a binding registered in the dispatch
scope's registry. Each dispatch takes a snapshot; `dispatched` and `settled`
(§6) are exact over that snapshot. An enrolled binding may execute anywhere
(§7), but its reachability is part of the signal's settlement path —
enrolled means counted and waited on. Reachability of the full snapshot —
gates _and_ enrolled inline bindings — is evaluated **before the dispatch
proceeds**: a dispatch that cannot invoke its enrolled bindings concludes
`failed` per the declared posture (§9), never stranding between
`dispatched` and `settled`. A binding that fails _after_ conclusion (dies
mid-invocation) is an invocation failure: it settles as an error under the
failure contract (§1), and the dispatch still reaches `dispatched` and
`settled`.

### 5.3 Async: interest

Async participation is **interest**: open subscription from anywhere, at any
time, propagated however the substrate propagates interest. Interested
handlers receive the signal per the delivery policy (§8) and are never
counted: they do not appear in the _originating_ dispatch's lifecycle
events, settlement, or acks. Completion of an async handler is
unobservable by contract; an AppCtx it returns enters as a new dispatch
whenever it resolves. Mesh-wide async invocation order is undefined —
order across the mesh is causal (chains), never positional.

**Delivery to interest is entry into the subscriber's dispatch scope** —
not bare handler invocation. The subscriber's scope applies its own full
contract: its own snapshot, its own lifecycle events, its own gates
(per-scope policy — parallel scopes, exactly the invariant-5 structure
channels already have). Two consequences: the subscriber's `received` is
its own dedup anchor (a redelivered parent can be dropped there before
its async handlers ever re-run — duplicate absorption upstream of the §8
identity machinery), and the emitting dispatch never snapshots its
audience — the audience is whatever interest the substrate holds at
emission; each receiving scope snapshots only its own handlers on entry.

> **Plainly** — Intercepts: every gate is asked before a signal passes; one
> "no" kills it even mid-partition; a gate that can't be reached blocks
> passage, never gets skipped. Inline: registering enrolls you — the signal
> isn't handled until your handler finishes, and your node being down can
> block settlement; you matter, you're waited on. Async: subscribe from
> anywhere; you get the signal, nobody waits on you, nothing counts you.
> The one question that picks between inline and async: does the system
> need to consider the signal _unhandled_ until your code runs? Yes →
> inline. No, you're just reacting → async.

---

## 6. The dispatch lifecycle

The paradigm defines four observable events per dispatch
([`TAO-SPEC.md` §4](./TAO-SPEC.md#4-the-dispatch-lifecycle)): **received → concluded → dispatched → settled**,
in that order, each at most once — `received` and `concluded` fire for
every dispatch; `dispatched` and `settled` fire exactly when the outcome
is `proceeded`. The mesh consumes them as its anchor points:

| event        | obligation owner whose job is done            | mesh usage                                                                                                                                                                       |
| ------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `received`   | the edge (it delivered)                       | dedup anchor: identity check happens here, before any work; a duplicate is a `received` with no successors — legible, never silently swallowed                                   |
| `concluded`  | the router (outcome determined)               | posture outcomes surface here: a dispatch that cannot proceed concludes as `failed` — observable, traceable, returned to no one                                                  |
| `dispatched` | the mesh (every inline binding invoked)       | the communication/execution boundary: "concluded but never dispatched" is a mesh defect; "dispatched but never settled" is a handler defect — attributable without investigation |
| `settled`    | the handlers (every inline binding completed) | the processing anchor                                                                                                                                                            |

Delivery acks anchor to events, as declared capability (§10): ack-at-
`received` ("arrived"), ack-at-`dispatched` ("delivered to every handler"),
ack-at-`settled` ("fully processed").

**Waypoints, never orchestration.** Events are observation waypoints on the
decoration plane. The dispatch drives the events; events MUST NOT gate the
dispatch, and events are not signals in the network — no meta-signals.
Implementations attach machinery (acks, dedup, tracing, wrappers) to
waypoints; causality flows only outward.

**There is no client await.** Firing a signal returns nothing, at every
scale, forever. Request/response ergonomics are wrapper contracts
(Transponder-style) built by observing the network — declared responses
(§4) and origin-routed reply hops — and are declared capabilities, not
paradigm.

> **Plainly** — Every signal leaves a four-beat trail: it arrived, the
> gates ruled, every handler was called, every handler finished. You can
> watch the trail (that's how tracing, acks, and wrappers work); you can't
> steer by it — your code steers with handlers and chains, nothing else.
> And firing a signal still returns nothing; if you want an answer, use a
> wrapper that watches for the declared response.

---

## 7. Edges

A mesh has exactly two edge kinds. Everything that crosses either one is a
value ([`TAO-SPEC.md` §2](./TAO-SPEC.md#2-the-datum-contract)); a conformant handler cannot distinguish
in-process dispatch from edge dispatch by datum aliasing.

### 7.1 Propagation edges

A propagation edge carries signals between dispatch scopes. Its contract is
[`TAO-SPEC.md` §7](./TAO-SPEC.md#7-the-wire-contract), verbatim: `{ tao, data, envelope: { v, chain } }`
alongside the transport's own framing; `chain` is the only envelope scope
that crosses; the receiver stamps its own hop. `@tao.js/transport-tck` is
its executable form; a mesh link is a TCK-passing transport.

### 7.2 Invocation edges

An invocation edge carries one handler invocation from a dispatch scope to
a binding and carries the return back:

- request: `{ v: 1, tao: { t, a, o }, data }`
- response: `{ v: 1, outcome: 'return' | 'error', value? }` — where an
  AppCtx-shaped return (a redirect or chain) crosses in §9 trigram form
  (`{ tao, data }`), and an error crosses as data, never as a thrown
  control-flow escape.

In-process, the invocation edge is degenerate — a function call. The
paradigm's guarantees that mention "same tick" or reference sharing
([`ENVELOPE-SPEC.md` §10](./ENVELOPE-SPEC.md#10-behavioral-invariants) invariant 8, datum reference passing) are
properties of the degenerate edge only. A conformance kit for invocation
edges (a TCK sibling) accompanies the first non-degenerate implementation.

### 7.3 Codecs and data models

The wire contracts above are **structural, not textual**. The encoding is a
declared edge capability (JSON, msgpack, CBOR, …). Floors and matching:

- `envelope.chain` MUST be representable in the JSON data model — that is
  its portability floor; any codec carrying that model is legal.
- A datum may exploit a richer codec model (binary payloads over msgpack).
  Each placement unit declares its required datum model in the app's TAO;
  an edge's declared data model MUST contain the datum models of every
  unit routed over it — statically checkable.
- Handler **returns** cross the invocation edge under the same rule as
  datums: a return value (settlement value, or a chained AppCtx's datum)
  MUST fit the edge's declared data model. Datums and returns travel the
  same wires; neither is exempt.

> **Plainly** — Signals travel two ways: scope-to-scope (the signal moves)
> and scope-to-handler (your code gets called). Both send values — copies,
> never shared objects — so your handler can't tell whether the caller was
> in-process or across the world. What format the bytes take is the
> architecture's choice; if your data needs a format an edge can't carry,
> deployment checking tells you before production does.

---

## 8. Delivery and identity

**Baseline: at-least-once.** A signal crossing edges may be delivered, and
therefore dispatched, more than once. Everything stronger is a declared
capability.

**Identity is normative.** Every signal has an identity:

- Entry signals receive a fresh, unique id from their dispatch scope.
- Signals chained by **enrolled** bindings — inline chains and gate
  redirects (the producing gate is the replacement's binding) — MUST
  derive their id deterministically as
  `H(parent id, producing binding's stable identity, per-binding output ordinal)`,
  the ordinal counting that binding's chained outputs within that
  dispatch. Binding identity comes
  from enrollment and MUST be stable across re-execution and failover.
  The derivation is order-independent across handlers (the ordinal is
  within one binding's own outputs), so unordered inline execution does not
  perturb ids.
- Chains produced by **async** handlers follow the **same derivation**,
  assigned by the _subscriber's_ dispatch scope (the parent dispatch never
  observes them — completion is unobservable; causally they are children
  all the same, as the engine's `hop.via: 'Async'` chain continuity
  already records): the parent id arrives with the signal, the
  discriminator is the **subscription's** stable identity, the ordinal is
  the handler's own output order. Where the subscription has durable
  identity, async chains converge exactly like enrolled ones — and pooled
  consumption converges too, because the discriminator is the _named
  group's_ identity, never the worker's (workers may be anonymous so long
  as the subscription is not; hashing worker-instance identity is an
  implementation bug). The discriminator is genuinely absent only for
  **ephemeral, unnamed subscriptions** — a browser socket whose
  subscription is the connection, or an auto-generated consumer name that
  changes on restart — and only when combined with redelivery (ephemeral
  interest normally receives at-most-once, where no duplicates arise).
  Async-chain convergence is therefore a **declared capability** —
  durable subscription identity (§10): an app that requires it turns a
  random-consumer-name deployment into an audit failure instead of a
  production surprise. Where it is knowingly absent, duplicates fall back
  to domain idempotency — the stated dissolution of ephemeral membership
  under at-least-once.

Deterministic identity is what makes redelivery recognizable and re-drive
convergent: a re-executed dispatch emits chained signals with the **same**
ids, so the duplicate wave meets dedup one hop out and self-extinguishes
(Appendix A: confluence).

**Convergent identity is not outcome idempotency.** A duplicate dispatch
re-consults its gates, and gates legitimately read live state — a cache
gate may miss on the first dispatch and redirect on the duplicate. What
prevents duplicate _decisions_ is dedup at `received` (drop the duplicate
before any gate runs); identity convergence bounds the chained _wave_
when a duplicate does run. Where neither applies, divergent outcomes
across duplicates are part of the stated at-least-once dissolution.

**Capabilities, not floor** (§10): dedup windows keyed on identity;
delivery modes per placement unit — `at-least-once` (baseline),
`at-most-once` (dedup-before-dispatch; declared loss window),
`effectively-once` (requires a declared inbox: the implementation brackets
dispatch with check/record against an app-wired store, transactional where
the store allows); ack anchors per §6.

The residual obligation on handler authors exists only where the
declaration leaves it: under `at-least-once` without a transactional inbox,
an inline handler may run more than once per logical signal, and its
effects are its author's to make idempotent. The spec's job is that this
obligation is readable off the declarations instead of discovered in
production.

> **Plainly** — The mesh may hand your handler the same signal twice;
> that's the price of never losing one. Your architecture can absorb
> duplicates for you (dedup, inbox) — check what your deployment declares.
> If it declares nothing, write your handler so running it twice is
> harmless. The signal's id is stable across retries, so "have I seen this
> id?" is always a legal defense.

---

## 9. Partition rules

The coordination surface of a dispatch is exactly the reachability of its
snapshot — its registered gates (`concluded`) and enrolled inline bindings
(`dispatched`/`settled`). There is no other coordination in the floor: no
required authority, no leases, no consensus store. (Single-sequencer
"home" designs are legitimate implementation patterns that trade
availability for capabilities like serialized dispatch — they are not
floor.)

Four floor rules:

1. **Complete-verdict rule.** Proceed requires the complete all-falsey
   verdict set over the snapshot (§5.1). No posture ever licenses skipping
   a snapshotted gate; postures govern what happens _instead of_
   proceeding. Halt remains decisive on partial verdicts.
2. **Postures are defined behaviorally.** An implementation declares, per
   placement unit, its behavior when the snapshot is not fully reachable
   (evaluated before proceeding, per §5.2; a failure _after_ conclusion
   settles as an invocation error, never a posture outcome):
   - `fail-fast` — conclude `failed` immediately;
   - `bounded-queue(window)` — hold entry up to the declared window (riding
     out routine failover), then conclude `failed`;
   - `block` — hold indefinitely;
   - `multi-scope` — dispatch proceeds independently in each partition,
     each scope gathering its **own complete** snapshot (never a partial
     one); duplicate cascades are possible and identity dedup (§8) is the
     declared absorber.
3. **Outcomes are observable.** A posture's result surfaces at `concluded`
   (outcome `failed`, with cause), traceable with chain identity — and
   returned to no one (§6: there is no client await).
4. **Dissolution is stated.** Every relaxed posture names what it gives up
   (`multi-scope` ⇒ duplicate dispatch across partitions; `at-most-once`
   ⇒ loss window; …) so the trade is informed, in the declaration, before
   deployment.

> **Plainly** — When the network splits, a "no" from any reachable gate
> still kills a signal, but nothing can _pass_ until every gate is
> reachable — gates get missed never, skipped never. What your app does
> meanwhile — fail, wait a bit, wait forever, or run independently on both
> sides and de-duplicate later — is a choice you declare per part of your
> Space, and the consequences of each choice are written down.

---

## 10. Capabilities and placement validity

The capability vocabulary is the mesh's extension surface. Implementations
declare what they provide; apps declare what each placement unit requires,
in the app's TAO. **A deployment is valid iff every declared requirement is
contained in the assigned architecture's declared capabilities** — a
set-containment check, statically decidable from the declarations, and the
formal content of "migrate (or blend) architectures without changing
business logic."

Initial vocabulary (extensible; each entry has defined behavioral
semantics where it appears in this spec):

| axis                    | values                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| delivery mode           | `at-least-once` (baseline) · `at-most-once` · `effectively-once` (inbox)                                                                               |
| ack anchor              | `received` · `dispatched` · `settled`                                                                                                                  |
| dedup                   | window keyed on signal identity                                                                                                                        |
| posture                 | `fail-fast` · `bounded-queue(window)` · `block` · `multi-scope`                                                                                        |
| edge codec / data model | JSON model (floor for chain) · richer declared models per edge                                                                                         |
| reply routing           | origin-correlated hop routing (feeds wrappers)                                                                                                         |
| subscription identity   | durable consumer identity per async subscription (§8 — async-chain convergence)                                                                        |
| response awaiting       | declared-response wrappers (§4)                                                                                                                        |
| subgraph settlement     | transitive settled-detection over inline-chained descendants (async branches are excluded in principle — their completion is unobservable by contract) |
| execution bindings      | in-process · FaaS · container · … (invocation-edge implementations)                                                                                    |

Capabilities attach at different **loci** — per placement unit (delivery
mode, posture), per edge (codec/data model), per subscription (durable
identity), per wrapper (response awaiting) — and the validity check
evaluates each requirement at its locus; "requirements ⊆ capabilities"
is the conjunction over all loci, not a single flat set.

Lints that MUST be derivable from the declarations (tooling, not runtime):
overlapping redirect-capable intercept patterns (§5.1); projection
concreteness for implementations that shard (a divert-capable gate's
pattern must be concrete in the axes the projection uses); datum-model
containment per edge (§7.3); requirement⊆capability per placement unit.

> **Plainly** — Your app writes down what each part of its Space needs
> (effectively-once? survives partition how? binary data?). Each architecture
> writes down what it gives. Deployment is a checkbox audit a tool runs —
> including mixed deployments where half your Space lives on one
> architecture and half on another. Moving architectures means re-running
> the audit, not rewriting handlers.

---

## 11. Substrate bindings (non-normative examples)

- **In-process** (today's `@tao.js/core`): every edge degenerate, snapshot
  registries native, lifecycle exact, delivery exactly-once trivially. The
  degenerate mesh — and the reference for paradigm semantics.
- **Subject broker (NATS-family)**: points map to three-token subjects
  (`tao.<t>.<a>.<o>`); interest is subject subscription with per-token
  wildcards; persistence/redelivery (JetStream-style streams and acks)
  supplies `at-least-once` with ack anchors; request/reply supplies
  `fail-fast` posture and reply routing. Single-sequencer capabilities need
  a lease primitive (e.g., TTL'd KV) — queue groups alone load-balance,
  they do not confer authority.
- **FaaS**: gates and inline bindings as stateless functions behind
  invocation edges; async interest as native event-source bindings; the
  scatter-gather intercept phase is the natural fit (verdict latency =
  max, not sum). Isolation comes structurally: the invocation is the
  isolation unit and never contains the dispatcher.
- **Blended**: any mix of the above, per placement unit, validated by the
  §10 containment check.

---

## 12. Conformance

- All checks are stated behaviorally, so any language can implement them.
- **Propagation edges**: `@tao.js/transport-tck` (existing).
- **Invocation edges**: a TCK sibling (to accompany the first
  non-degenerate implementation).
- **Lifecycle**: assert the event state machine — in order, each at most
  once; `received`/`concluded` for every dispatch, `dispatched`/`settled`
  iff the outcome is `proceeded`.
- **Cross-implementation runs are the induction proof**: mesh-wide
  guarantees are obtained by induction over edges, so a link with different
  implementations (or languages) on each side, passing the kits, is the
  moment "adheres to the paradigm ⇒ translates across implementations"
  becomes a test result.
- Candidate 1.0 artifact: a TLA+ model of the floor (lifecycle ordering,
  conditional completeness, postures, redelivery) checked for the
  partition/redelivery interleavings no test suite enumerates.

---

## Appendix A. Formal foundations (non-normative)

| layer                 | formalism                                                                                                                                                                          | what it buys                                                                                                                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Space + wildcards     | product posets; patterns as cylinder sets; patterns⇄point-sets as a Galois connection                                                                                              | matching, subsumption, and overlap-lints are lattice operations with known laws                                                                                                                                                                                   |
| intercept combination | fold over a commutative monoid (falsey = identity, truthy = absorbing)                                                                                                             | order/parallelism unobservability is one theorem: commutativity + associativity; the fan-out license in a line                                                                                                                                                    |
| Protocols             | labeled transition systems over alphabet Σ = Space; conformance = trace inclusion                                                                                                  | drift detection = language membership; multiparty-session-type projection (global type → per-participant obligations) is the theorized form of placement projection                                                                                               |
| lifecycle + floor     | temporal logic over event traces; conformance = refinement                                                                                                                         | the floor is TLA+-specifiable and model-checkable                                                                                                                                                                                                                 |
| delivery + re-drive   | idempotence + confluence                                                                                                                                                           | "deterministic child ids make the duplicate wave self-extinguish" becomes provable                                                                                                                                                                                |
| datum contract        | observational equivalence                                                                                                                                                          | the in-process/edge indistinguishability claim, stated as it would be proven                                                                                                                                                                                      |
| Space + declaration   | the signature of an event ontology (points = event classes); declared/open mode ↔ closed/open-world at the vocabulary level; drift detection ↔ a-posteriori consistency checking | the ontology tradition's scarce part — closed signature, declared paths, checkable usage — without axioms, subsumption, or a reasoner: dispatch stays exact, and taxonomy, where an app wants it, is declared metadata for tooling and agents, never for matching |

## Appendix B. Implementation notes (non-normative)

- **Coordinate encoding**: intern each axis's tokens to integers; a point
  packs into one machine word. A point matches at most 2³ = 8 patterns
  (each axis: its token or `*`), so dispatch is at most 8 hash probes on
  packed words — constant, no trie-walking. This is a direct payoff of the
  fixed three-token grammar; arbitrary-depth subject systems cannot do it.
- **Declared mode compounds it**: closed vocabulary ⇒ perfect hashing,
  dense precompiled dispatch tables, slices as bitmasks (intersection =
  AND), projections as arithmetic on coordinates.
- **Dispatch is exact; observation may be approximate.** The axes are
  nominal — no metric exists between tokens, and approximate matching on
  the dispatch plane is off-contract (the typo defense requires
  out-of-Space signals to die, not round to the nearest Term). Learned
  embeddings live legally on the observation plane only: traffic
  clustering, anomaly detection, semantic search over the Space for
  agents.
