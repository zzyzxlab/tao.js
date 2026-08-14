# TAO and Agentic Programming

Why tao.js fits how AI agents build and maintain software, what already
delivers on that fit, and the checklist to close the rest. Companion to
[`TAO-SPEC.md`](./TAO-SPEC.md) (the paradigm), [`MESH-SPEC.md`](./MESH-SPEC.md) (the mesh floor), and
[`AGENTS.md`](./AGENTS.md) (the working guide for agents in this repo).

---

## 1. The thesis: agents re-price TAO's trade

TAO's costs and benefits were always real; what changed is the buyer.

Human developers pay TAO's costs immediately — indirection, ceremony, a
paradigm with no Stack Overflow presence — and collect its benefits later
(swappable architecture, decoupling, business legibility). Humans are
poor customers for deferred-payoff discipline, and adoption reflected
that.

Agents invert the pricing:

- The costs that repelled humans are nearly free for agents. They don't
  resent uniform ceremony, they don't need years to internalize idioms
  when the protocol is supplied per-session, and explicit-over-implicit
  is pure upside for a reader with no memory of the codebase.
- The deferred benefits stop being deferred. "Swap architectures under
  the business logic" was hypothetical for a human team; for agents,
  migrations are a primary workload — and a protocol-of-handlers app
  turns a migration into a mechanical, parallelizable re-binding task
  (one handler per agent, the protocol as the invariant).

The defining property of the agentic era: **the median reader of any
codebase is a stranger.** Every design decision that was deferred as
"not needed, the author can see it" gets re-opened. TAO's answer is that
the system's behavior is an explicit, enumerable, product-language
protocol rather than an emergent property of a call graph.

The same re-pricing applies to knowledge representation. Ontologies
formalized semantics because the machines reading them couldn't
understand prose — and that formal layer (axioms, subsumption,
reasoners) was the expensive part that killed most enterprise ontology
efforts. LLMs make it nearly free to skip: an agent supplies the
reasoning by reading `TAO.md`'s descriptions. What an agent cannot
conjure is a closed, enumerable, structurally exact vocabulary —
hallucination lives exactly where the signature is open. An app's
declared Space keeps the scarce part of the ontology tradition — a
closed signature of event classes, declared paths, checkable usage
([`MESH-SPEC.md` §3](./MESH-SPEC.md#3-the-space-and-the-apps-tao),
[Appendix A](./MESH-SPEC.md#appendix-a-formal-foundations-non-normative))
— and discards the part LLMs obsoleted.

## 2. What agents get from TAO

| property                                                                                                                                     | why it matters to an agent                                                                                              | status                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigrams as a machine-readable ubiquitous language** — the complete set of product-language state transitions, greppable as string anchors | "What does this app do?" is answerable from the vocabulary, not reverse-engineered from controller/service layers       | ✅ inherent; strengthened by [`AGENTS.md`](./AGENTS.md) §"What TAO is"                                                                                                           |
| **Additive change model** — new behavior = a new handler; existing code untouched                                                            | Additive change is where agents are safest and most reliable; open/closed by construction                               | ✅ inherent                                                                                                                                                                      |
| **Uniform handler signature** `(tao, data)` — one shape everywhere                                                                           | Minimal context to act: the vocabulary plus one handler file                                                            | ✅ inherent                                                                                                                                                                      |
| **Universal observability at a narrow waist** — all behavior passes through one dispatch plane                                               | Complete business-language observability is a one-liner, not an instrumentation project                                 | ✅ `TaoLogger` (sequence) + `@tao.js/telemetry` Tracer (causality, zero instrumentation)                                                                                         |
| **Causal verify loop** — run the app, read back the cause→effect tree in product language                                                    | Agents verify by observed behavior; the tracer turns "did my change do what I meant?" into reading a tree               | ✅ `@tao.js/telemetry` (`InMemorySink.format()`); OTel export via `@tao.js/opentelemetry`                                                                                        |
| **Failure localization** — black-box test fails → open the one handler that misbehaved                                                       | Causal trees substitute for the author's mental model when the reader is a stranger                                     | ✅ tracer; ERROR settlement in the dispatch loop surfaces handler failures                                                                                                       |
| **A written protocol, not just an implementation** — envelope scopes + trigram + phases as the contract                                      | Cross-language implementations and transports build from the spec, and agents load the contract instead of inferring it | ✅ [`TAO-SPEC.md`](./TAO-SPEC.md) (the paradigm, standalone) + [`MESH-SPEC.md`](./MESH-SPEC.md) (the mesh floor); [`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) records the JS engine |
| **Deterministic, non-competitive extension** — `decorate()` with composition laws                                                            | Agents add adapters/observers without needing global knowledge of who else is attached                                  | ✅ envelope redesign (PR #59); fully clean as of the 0.19 cutover                                                                                                                |

Meta-evidence: the envelope migration itself was executed agentically —
spec-first, against eight behavioral invariants, verified by unmodified
test suites, 100% mutation scores, and an end-to-end socket round-trip.
The paradigm's legibility is what made that tractable.

## 3. Friction points and their mediations

| friction                                                                                                 | why it hurts agents                                                                             | mediation                                                                                                                                                                                                                                                                              | status                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Emergent control flow** — "what handles `{T,A,O}`?" has no go-to-definition; wildcards defeat grep     | The one place agents must reconstruct global state from local reads                             | Static **protocol extractor**: enumerate trigrams, handlers with `file:line`, chain edges; merge with observed traces for the dynamic edges (wildcards, data-dependent chains)                                                                                                         | ⬜ to build                                                                                                 |
| **Chains are runtime-emergent**                                                                          | "What happens end-to-end?" requires transitive reading                                          | Causal tracer                                                                                                                                                                                                                                                                          | ✅ shipped                                                                                                  |
| **Silent failure of string-keyed dispatch** — a typo'd trigram is a no-op, not an error                  | Converts an agent's most common failure mode (plausible-but-wrong wiring) into an invisible one | **Typed trigram vocabularies** (TS-first): app declares Terms/Actions/Orients (the Space's axes); typos are out-of-Space ([`MESH-SPEC.md` §3](./MESH-SPEC.md#3-the-space-and-the-apps-tao)) and become compile errors. Interim: tracer makes no-ops visible (entry recorded, no chain) | ⬜ TS wrapper ([`FUTURE.md`](./FUTURE.md))                                                                  |
| **No training-data priors** — models hallucinate the API                                                 | Every session needs the contract in-context                                                     | **`TAO.md` convention** for apps (the app's TAO — its declared Space and Protocols — as an intentional artifact; [`MESH-SPEC.md` §3](./MESH-SPEC.md#3-the-space-and-the-apps-tao)); dense `llms.txt`-style API docs; this repo's [`AGENTS.md`](./AGENTS.md) as the library-side guide  | ◐ [`AGENTS.md`](./AGENTS.md) shipped; `TAO.md` spec/template and docs rewrite on [`FUTURE.md`](./FUTURE.md) |
| **Small context to act vs. global context to verify** — non-interference is a global property            | The agent can make the change cheaply but not cheaply prove it safe                             | Protocol-map artifact (extractor output) loadable in a few thousand tokens; per-network decoration keys are namespaced and exclusive                                                                                                                                                   | ⬜ extractor; ✅ chain-key exclusivity                                                                      |
| **Cross-process blindness** — client and server cascades are separate traces                             | Round-trip behavior is the real unit of verification for client-server apps                     | Native `envelope.chain` transport in socket.io/koa (one `traceId` per round trip); manual W3C `traceparent` continuation exists today                                                                                                                                                  | ✅ shipped in 0.20 (socket.io + koa on the boundary primitives; TCK-verified)                               |
| **Dual dispatch surface** — legacy + envelope modes double what an agent must know (and can hallucinate) | Two ways to do things is a prior-free model's trap                                              | §12 legacy retirement: `enter()` + `decorate()` as the entire Network surface                                                                                                                                                                                                          | ✅ shipped in 0.19 ([`ENVELOPE-SPEC.md` §12](./ENVELOPE-SPEC.md#12-legacy-retirement-the-019-cutover))      |
| **Deprecated surfaces linger** (`RenderHandler.context`, `DataConsumer`, `TaoLogger` re-export in utils) | Smaller surface = fewer wrong targets                                                           | Complete the existing deprecation ladders                                                                                                                                                                                                                                              | ✅ completed in 0.21 (removals shipped)                                                                     |
| **The thesis is asserted, not measured**                                                                 | "Agents work better against TAO apps" deserves evidence                                         | Benchmark: identical feature requests run agentically against a TAO app (with the toolkit) vs. an equivalent conventional app; measure success rate, tokens, files touched                                                                                                             | ⬜ to design                                                                                                |

## 4. Checklist to full delivery

Shipped (PR #59 and prior):

- [x] Causal tracer as a pure decoration — zero instrumentation
      (`@tao.js/telemetry`)
- [x] OpenTelemetry export with causal parentage (`@tao.js/opentelemetry`)
- [x] The signal-plane contract as a written spec ([`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md))
- [x] Non-competitive adapter interface with composition laws
      (`Network.decorate`)
- [x] Handler-failure settlement (ERROR phase) replacing silent swallows
      where settlement is attached
- [x] Library-side agent guide ([`AGENTS.md`](./AGENTS.md)) with the envelope contract
      summary
- [x] W3C traceparent continuation for manual cross-process tracing

Remaining (roughly in leverage order):

- [ ] **Protocol extractor** — static tool emitting the app's TAO (the
      Space's axes, handlers with `file:line`, chain edges toward declared
      Protocols, incl. wildcard coverage) as JSON + rendered map; merge
      observed traces for dynamic edges. This is the single highest-leverage item: it closes the
      emergent-control-flow and global-verification frictions at once.
- [ ] **`TAO.md` spec + template + tooling** for consuming apps — the
      per-app TAO artifact (Space + Protocols, [`MESH-SPEC.md` §3](./MESH-SPEC.md#3-the-space-and-the-apps-tao)) agents
      load first (already on [`FUTURE.md`](./FUTURE.md); the extractor should generate
      its skeleton)
- [ ] **Typed trigram vocabularies** via the TypeScript wrapper — silent
      no-ops become compile errors ([`FUTURE.md`](./FUTURE.md))
- [ ] **Agent skill / MCP server** over the extractor + tracer:
      "what handles `{T,A,O}`", "trace the chain from …", "where is this
      fired" — makes TAO apps _more_ navigable than call-graph codebases
- [x] **Native `envelope.chain` transport** (socket.io/koa): one `traceId`
      across the client→server→client round trip ([`ENVELOPE-SPEC.md` §9](./ENVELOPE-SPEC.md#9-cross-process-wire-contract))
      — shipped in 0.20 with the boundary primitives + TCK
- [x] **0.19 legacy retirement** — one dispatch surface to learn
      ([`ENVELOPE-SPEC.md` §12](./ENVELOPE-SPEC.md#12-legacy-retirement-the-019-cutover))
- [ ] **Dense context docs** — `llms.txt` / single-page API reference for
      per-session injection (fold into the docs-site rewrite)
- [x] **Finish deprecation ladders** — react data-consume APIs, utils
      `TaoLogger` re-export — completed in 0.21
- [ ] **The benchmark** — agent-vs-agent on TAO app + toolkit vs.
      conventional app; publish method and results, whatever they show
- [ ] **Route-layer synergies** — per-navigation Channels (stale-loader
      races), loader-await via Transponder/Transceiver, SSR→hydration
      trace continuation through `@tao.js/routing-*`

The order matters: extractor → TAO.md → skill build on each other, and
everything downstream of 0.19 should build on the single-surface core.
