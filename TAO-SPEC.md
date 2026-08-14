# TAO-SPEC.md — The TAO Paradigm

Status: **normative, drafted for 1.0.** This document is the paradigm
layer: the complete portable contract of TAO — what every implementation,
in any language, at any scale, must honor. It contains no implementation
history and describes no particular engine.

Companions:

- [`MESH-SPEC.md`](./MESH-SPEC.md) — the TAO Mesh Profile, layered above this contract
- [`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) — the design record of the JavaScript implementation
  (tao.js): its signal-plane architecture, adapter contracts, and the
  engine-level guarantees that are stronger than this document
- `TAO.md` (convention, per app) — an app's declared Space and Protocols
  ([`MESH-SPEC.md` §3](./MESH-SPEC.md#3-the-space-and-the-apps-tao))
- [`packages/tao-transport-tck`](./packages/tao-transport-tck) — the
  executable form of the [wire contract (§7)](#7-the-wire-contract)

---

## 0. How to read this spec

Every contract section ends with a **Plainly** block: the same contract in
the words a developer needs while writing code. Both forms are normative;
the formal text governs if they ever disagree, and any disagreement is a
spec bug to fix.

MUST / MUST NOT / MAY carry their RFC 2119 meanings. "An implementation"
means any conformant engine — single-process or distributed, any
language. Where an engine's actual behavior is _stronger_ than this
contract, the surplus is unobservable to a conformant app and off-contract
to rely upon.

---

## 1. The grammar

TAO builds applications as a **reactive signal network** of semantic
business events. The grammar is three tokens, three phases, and chaining —
everything else is vocabulary the application supplies.

- A **trigram** is three strings — **Term** (the thing), **Action** (the
  operation on it), **Orient**(ation) (the perspective or surface of the
  interaction). A trigram is the address of a signal.
- A **signal** (an Application Context, _AppCon_) is a concrete trigram
  plus an optional **datum** (§2). Signals are concrete: every part named.
- A **pattern** is a trigram where any part may be a **wildcard**,
  matching that axis entirely. Patterns are for handler registration;
  signals are for dispatch.
- **Handlers** are plain functions `(tao, data)` — `tao` is the matched
  trigram, `data` the datum (always an object, possibly empty). One shape,
  every phase, everywhere. The envelope (§6) is never exposed to handlers.
- A handler is registered against a pattern in one of three **phases** —
  Intercept, Async, Inline (§3) — in a **dispatch scope**: the registry
  and engine a signal dispatches in.
- A handler MAY return a new AppCon: it **chains** — the returned signal
  enters as a new dispatch, causally linked to its parent. A signal and
  its transitive chains form a **cascade**.
- **Chains are the paradigm's only ordering mechanism** beyond the phase
  priority (§3). Sequence between business steps is expressed as chained
  signals — declarable as Protocols ([`MESH-SPEC.md` §4](./MESH-SPEC.md#4-protocols)) — never as
  registration order, priorities, or scheduling assumptions.

> **Plainly** — You name things (Terms), what happens to them (Actions),
> and from whose perspective (Orients). A signal is one concrete
> combination plus data. Handlers are `(tao, data)` functions matched by
> pattern; return a new signal to say what happens next. If B must follow
> A, chain B from A — that is the only "ordering" TAO has or needs.

---

## 2. The datum contract

Obligations on signal producers and consumers that every engine relies
on. The governing principle: **a datum is a value.** Once a signal
carries it, it has one meaning everywhere, forever.

1. **Handlers MUST NOT mutate the received datum.** Enrichment happens
   only by returning a new AppCon — a redirect or a chain.
2. **Ownership transfers at entry.** Once a signal is fired (or returned
   as a chain), its datum belongs to the dispatch; the producer MUST NOT
   mutate it afterward. (Async handlers run after the producer's frame —
   a caller reusing a buffer would race its own cascade.)
3. **Observers observe purely** (§5) — observation never mutates a datum.
4. **The license: a returned datum MAY share structure with the received
   one.** `{ ...data, User: updatedUser }` keeps every untouched
   reference. Sharing is sound _because of_ rules 1–3.

Immutability is not copying — it is what makes **zero-copy safe**:
pass-by-reference and pass-by-value are indistinguishable exactly when
nobody mutates. In-process, a large datum flowing through a ten-hop chain
is one allocation and ten references; copies exist only at real
serialization boundaries, where they are inherent. The distribution
consequence ([`MESH-SPEC.md` §7](./MESH-SPEC.md#7-edges)): a conformant handler cannot distinguish
in-process dispatch from remote dispatch by datum aliasing.

Large datums are fine — carrying a big value through a chain is one
allocation, per the paragraph above. What does not belong in datums is
**accumulation across hops**: a value that grows a little at each hop
and re-ships in full is quadratic in memory under immutable append, and
quadratic on the wire regardless. Growing state lives in an app-owned
store; the datum carries the key (a domain id, or the signal's identity
where none exists), each hop writes its increment, and the consumer
reads the store once. Signals are events, not data pipes: a datum
carries meaning and identity; stores carry bulk.

Enforcement is layered and never a production cost: the obligation is
normative here; an implementation MAY offer a development-mode freeze (a
§5 observation that makes violations throw); typed vocabularies type
handler datum parameters as deep-readonly.

> **Plainly** — Treat the datum you receive as read-only, and hands off
> once you've fired a signal — the data rides the network now. To change
> something, return a new signal whose datum reuses everything you didn't
> change. You never need to copy for safety, and the engine never copies
> either; that's the deal immutability buys.

---

## 3. The phase contract

**One universal priority exists: Intercept → Async → Inline.** There is
no other priority mechanism, and there never will be: one pre-condition
mechanism with one guaranteed invocation priority is what keeps TAO
reliable everywhere for everyone. Its portable content, precisely: the
intercept barrier concludes first and gates everything; on **proceed**,
delivery to async interest is **committed** — owed to every matching
async handler per the delivery policy, unaffected by anything the inline
phase does or returns; the inline phase then executes and settles the
dispatch. "Async before Inline" is a **commitment ordering, not a
scheduling promise** — a serialized engine may realize the commitment by
initiating every async call before the first inline handler runs; that
scheduling is implementation, the commitment is contract.

**Snapshot semantics.** The handlers a dispatch considers — in every
phase — are those registered in its dispatch scope at dispatch time: its
**snapshot**. Registration is dynamic (add and remove at any time); each
dispatch binds to its snapshot exactly once, and a handler registered
after dispatch is not retroactively included.

### Intercept

Intercept handlers exist to **check pre-conditions and redirect chains**.
Observation belongs to the observation plane (§5), never to intercepts.

- **Barrier**: the intercept phase settles before any async or inline
  handler fires.
- **Conditional completeness**: to **proceed**, every matching intercept
  in the snapshot MUST have been consulted and returned falsey. **Halt**
  (one truthy) is decisive — remaining consultations are unspecified:
  implementations may short-circuit, run all concurrently, or cancel.
  **Redirect** (an AppCon return) is decisive-as-forward: the current
  dispatch concludes with nothing proceeding, and the replacement enters
  as a new dispatch that faces its own complete intercept phase — a
  redirect changes which signal faces the gates, never skips them.
- **Unordered**: intercepts may run in any order, possibly concurrently.
  Verdict combination is commutative and associative, which is the formal
  license for that freedom.
- **An error is a missing verdict, never a falsey.** A throwing or
  failing intercept blocks proceed; errors are never passes.
- **Determinism at races**: a concurrent truthy-vs-AppCon race resolves
  deterministically **within a dispatch**; the implementation declares
  its tiebreak. (Across duplicate dispatches no such promise exists —
  intercepts read live state; [`MESH-SPEC.md` §8](./MESH-SPEC.md#8-delivery-and-identity).) Tooling lints
  overlapping redirect-capable patterns.

> **Plainly** — What you can rely on: if your signal runs, _every_
> matching intercept was asked and said falsey; one truthy kills it; an
> AppCon return redirects — the original dies and the new signal faces
> its own gates; a gate that can't answer blocks passage — a missing
> verdict is never a pass. What you can't rely on: order (any order,
> maybe simultaneous) and being called (a peer's verdict may conclude the
> dispatch without you). So never put must-run-for-every-signal logic in
> an intercept — that's the observation plane's job.

### Inline

- Inline handlers run only after the intercept phase passes.
- **Every** matching inline handler in the snapshot is called — inline
  has no verdicts.
- **Unordered** among themselves; sequence is chained trigrams.
- A returned AppCon chains the cascade.
- **Settlement**: the signal settles when all inline handlers have
  completed (returned or errored). Inline completion is part of "this
  signal has been handled"; an inline error is part of settlement —
  reported and isolated, never blocking sibling handlers.
- Execution timing ("same tick", shared stack) is never contract — an
  engine's stronger local behavior is recorded in that engine's design
  document, not here.

### Async

- Every matching async handler is called (delivery policy governs across
  a mesh); calls are never awaited and completion is unobservable by
  design. The paradigm ordering is the **commitment** stated above: once
  the dispatch proceeds, async delivery is owed and cannot be gated,
  delayed, or cancelled by inline execution or its outcomes.
- An AppCon returned by an async handler enters as a new dispatch
  whenever it resolves — causally a child of its parent, like every
  chain.

> **Plainly** — Inline: registering enrolls you — the signal isn't
> handled until your handler finishes; you're counted and waited on.
> Async: subscribe from anywhere; you get the signal, you react, nobody
> waits on you. The one question that picks between them: does the system
> need to consider the signal _unhandled_ until your code runs? Yes →
> inline. No, you're just reacting → async.

---

## 4. The dispatch lifecycle

Every dispatch produces observable events from a fixed set of four — **in
order, each at most once**; `received` and `concluded` fire for every
dispatch, `dispatched` and `settled` exactly when the outcome is
`proceeded`:

| event        | meaning                                                                                  | whose job is done                    |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `received`   | the signal entered the dispatch scope, before any intercept runs                         | the edge/entry surface: it delivered |
| `concluded`  | the intercept outcome is determined: `proceeded` \| `halted` \| `redirected` \| `failed` | the routing decision                 |
| `dispatched` | every inline handler in the snapshot has been invoked                                    | the dispatch machinery               |
| `settled`    | every inline handler has completed                                                       | the handlers                         |

A halted, redirected, or failed dispatch legally stops at `concluded`.

**Events are observation waypoints, never orchestration primitives.** The
dispatch drives the events; events never gate the dispatch. They are not
signals in the network — no meta-signals — and application logic does not
branch on them. Machinery attaches _to_ them: tracing, delivery acks and
dedup ([`MESH-SPEC.md` §6](./MESH-SPEC.md#6-the-dispatch-lifecycle)), wrappers. Causality flows only outward.

**There is no client await.** Firing a signal returns nothing, at every
scale, permanently. Request/response ergonomics are wrapper contracts
built by observing the network — and wrappers await _declared_ responses
([`MESH-SPEC.md` §4](./MESH-SPEC.md#4-protocols)), not whichever descendant happens to chain first.

Events surface on the observation plane (§5).

> **Plainly** — Every signal leaves a four-beat trail: it arrived, the
> gates ruled, every handler was called, every handler finished. Tracing,
> acks, and request/response wrappers all work by watching the trail.
> Your code never steers by it — handlers and chains are the only wheel.
> And firing a signal still returns nothing; if you want an answer, use a
> wrapper that watches for the declared response.

---

## 5. The observation plane

Every implementation MUST provide an out-of-band observation surface at
its dispatch plane, exposing:

- the four lifecycle events (§4), per dispatch;
- every chained AppCon, at every hop (invariant 1, §8);
- handler settlement: non-AppCon returns and errors, attributed to their
  phase and handler.

Four laws govern it:

1. **Out-of-band**: observations are not signals; observing a dispatch
   never dispatches.
2. **Pure**: observers never mutate signals, datums, or dispatch state.
3. **Non-competitive**: observers compose without coordinating — no
   observer's correctness may depend on another observer's presence,
   absence, or order.
4. **Powerless**: nothing observed can gate, divert, or reorder a
   dispatch. Causality flows outward only.

Per-hop **derived state** (the chain scope, §6) is part of this plane: an
observer may register a namespaced reducer computing parent→child state
each hop (trace context is the canonical case). Namespaces are owned;
one owner per namespace per dispatch scope.

The JavaScript engine's observation surface is its decoration interface
([`ENVELOPE-SPEC.md` §5](./ENVELOPE-SPEC.md#5-decorator-interface)) — one implementation of this section.

> **Plainly** — Watching is free and safe: you can see every signal,
> every outcome, every error, with zero instrumentation — but watching
> can never touch. If you need to _affect_ signals, you're not an
> observer; use a handler.

---

## 6. The envelope scopes

Every dispatch carries an **envelope** — signal-plane context handlers
never see — with exactly three scopes, taxonomized by lifetime and
locality:

| scope     | lifetime                                     | locality                                                                                                                                                                                 |
| --------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cascade` | one shared context for the whole cascade     | process-local; **never crosses a boundary** — it holds live capabilities and local affinity, which a transport **translates** into its own terms, never copies                           |
| `hop`     | a single hop                                 | boundary-local; **never crosses** — each receiver stamps its own hop (e.g., its own echo-suppression marker)                                                                             |
| `chain`   | derived parent → child, each hop, by reducer | **the only scope that crosses**: namespaced, JSON-representable by construction; a receiver re-reduces with its own reducers — keys it owns continue, keys it doesn't degrade gracefully |

The scopes are contract because the invariants (§8) and the wire contract
(§7) are stated in terms of them. Their in-engine mechanics are each
implementation's own design.

> **Plainly** — Three kinds of context ride with a signal: cascade-wide
> (stays home), this-hop-only (stays at each boundary), and the chain
> (travels). If you're building a transport: send the chain, only the
> chain, and stamp your own hop on arrival.

---

## 7. The wire contract

A transport forwards a signal by serializing, alongside its own framing:

```js
{ tao: { t, a, o }, data, envelope: { v: 1, chain } }
```

- `v` — wire-envelope version, integer, starting at `1`. Receivers ignore
  envelopes with an unknown `v` (treat as absent) rather than fail.
- `chain` — the sending hop's chain scope, verbatim. May be absent; the
  receiver treats absent/invalid chain as `null`.
- The receiver enters the signal with its **own** hop marker (its echo
  suppression must work locally) and re-reduces the chain with its own
  reducers.
- The contract is **structural, not textual**: any codec carrying the
  JSON data model is legal ([`MESH-SPEC.md` §7.3](./MESH-SPEC.md#73-codecs-and-data-models)); richer datum models are
  a declared edge capability.
- Compatibility is one-sided by construction: a receiver accepts payloads
  without `envelope`; an older receiver ignores an unknown `envelope`
  property.

Request/response transports without a symmetric channel (HTTP) map the
tracing chain key to W3C `traceparent` on the request; responses carry no
chain at `v: 1`.

`@tao.js/transport-tck` is the executable form of this section plus the
transport-relevant invariants (§8): delivery, echo suppression with the
bidirectional reflex, multi-hop emission, chain continuity across a round
trip, cascade scoping. A transport that passes it honors this contract.

> **Plainly** — On the wire a signal is its trigram, its data, and the
> chain — nothing else. Any format that can carry JSON's shapes can carry
> it. The receiving side stamps its own arrival marker and keeps tracing
> continuous. The conformance kit tells you if you got it wrong.

---

## 8. Invariants

The paradigm's behavioral invariants, stated portably. (Engine-level
guarantees stronger than these — e.g., same-tick chained dispatch — are
recorded in that engine's design document: [`ENVELOPE-SPEC.md` §10](./ENVELOPE-SPEC.md#10-behavioral-invariants) records
the JavaScript engine's, including which of its clauses are engine
surplus.)

1. **Every chained AppCon is observable on every hop** — the observation
   plane and any attached transport see all hops of a cascade, not just
   the entry.
2. **Scoped entries keep their affinity end-to-end.** A cascade entered
   through a scoped surface (a per-client channel, an awaiting wrapper)
   retains that scope's affinity for every hop — loss breaks reply
   delivery silently; over-broadcast leaks one client's data to another.
3. **Unscoped entries never acquire scoping** — a plain entry's cascade
   must not pick up channel or source affinity it never had.
4. **Descendants of a boundary-received signal flow back across that
   boundary.** Echo suppression applies to the arrival hop only — source
   marking is hop-scoped, never cascade-scoped — so replies and
   follow-ups return to the sender while the arrival itself is not
   echoed.
5. **A vetoed signal is suppressed for all later phases within its
   dispatch scope.** Parallel scopes observing the same signal (mirrored
   registries) gate independently, each by its own intercepts.
6. **Handler-return semantics and the phase priority are load-bearing** —
   §3 is the precise statement; no implementation may weaken halt,
   redirect, chaining, or the universal priority.
7. **Chain affinity is exact** — a wrapper's cascade tag survives
   multi-hop chains, so settlement machinery observing the cascade works
   for every descendant, not just the first hop.

> **Plainly** — Chains are never invisible; replies always find their
> way back and only to their asker; plain signals never leak into
> someone's private scope; a veto is a veto everywhere in its scope; and
> what handlers return means the same thing on every implementation of
> TAO, forever.

---

## 9. Conformance

- All checks are behavioral, so any language can implement them.
- **Wire**: `@tao.js/transport-tck` (§7).
- **Lifecycle**: assert the §4 state machine — in order, each at most
  once; `received`/`concluded` for every dispatch, `dispatched`/`settled`
  iff `proceeded`.
- **Phases**: §3's outcome semantics — conditional completeness,
  decisive halt, redirect-as-fresh-dispatch, error-is-not-a-pass — and
  the commutativity of verdict combination.
- **Mesh-level conformance** composes from this layer by induction over
  edges: [`MESH-SPEC.md` §12](./MESH-SPEC.md#12-conformance).
