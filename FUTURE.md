TAO is:

- a DSL used to build applications by creating
- semantic business events allowing for a reactive architecture

`TAO.md` (for apps that use tao.js):

- documents that app's TAO — its declared Space (Terms, Actions, Orients) and its Protocols (`MESH-SPEC.md` §3)
- is an intentional artifact of apps that implement with tao.js
- should be referenced from that app’s `AGENTS.md` so agents implementing there can find it

This repo’s agent guide is `AGENTS.md` (how to work on the tao.js library itself).

TODO

- [x] finish the transformation to nx.js (Nx 23.1.0; alpha ladder `0.16.3-alpha.nx{21,22,23}` on npm `alpha` tag)
- [ ] implement the TypeScript library wrapper — v2 transparent-DX design recorded in `TYPED-SPEC.md` §7 on `feat/typescript-wrapper` (PR #63: JSDoc pass + v1 built; a new session implements §7: part carriers → decorators → type-arg transform → path DSL)
- [ ] pre-1.0: `errorBoundary(kernel, onError)` helper + document the Node ≥15 interaction (an unsettled inline/intercept handler throw is an unhandled rejection → process death under default `--unhandled-rejections=throw`; async handlers are immune as of 0.20)
- [ ] pre-1.0: decide the unsettled-handler-error default — loud rethrow (current, deliberate: the process is the degenerate isolation unit, `MESH-SPEC.md` §1) vs settle-quiet; ergonomics/DX discussion pending with the author before any change (spec-first if changed)
- [x] contain sync-throwing async handlers — DONE in 0.20 (shipped with the async-phase contract)
- [ ] pre-1.0 (spec train follow-ups, PR #66): first-class lifecycle decoration callbacks for the four events (`ENVELOPE-SPEC.md` §15); retire Transponder's first-descendant race in favor of declared responses (`MESH-SPEC.md` §4); `freezeDatum` dev decoration (`ENVELOPE-SPEC.md` §13)
- [ ] invocation-edge conformance kit (TCK sibling, `MESH-SPEC.md` §7.2) — with the first non-degenerate execution binding
- [ ] TLA+ model of the mesh floor (`MESH-SPEC.md` §12) — 1.0 candidate artifact
- [x] complete all tests for 100% code coverage
- [x] create a mutation test suite and exercise it (Stryker on all public packages at 100% — `pnpm test:mutation:*`)
- [ ] rewrite documentation site
- [x] update to React 19 implementation for @taojs/react
- [x] `@tao.js/react` data-context 0.17: hooks modernize + tree-scoped `useTaoData` + soft-deprecate `RenderHandler.context`/`DataConsumer` (see `AGENTS.md` §5; removal still open)
- [x] `@tao.js/react` remove deprecated data consume APIs — done in 0.21: `RenderHandler.context` + positional ctx args, `DataConsumer`, `Provider` alias, `useTaoDataContext` alias, the Provider data bag, and all `propTypes` + the `prop-types` dependency (React 19 ignores propTypes; d.ts covers typing)
- [x] host-router adapters (`@tao.js/routing-core` + react-router / tanstack / next) — shipped in the fixed release group (0.18+)
- [x] signal-plane hardening: envelope scopes + Network decorations + settlement hook per `ENVELOPE-SPEC.md` (`feat/network-envelope`); `@tao.js/telemetry` (causal Tracer + TaoLogger) + `@tao.js/opentelemetry`
- [x] legacy retirement cutover (0.19.0): remove dual-mode dispatch per `ENVELOPE-SPEC.md` §12 (`feat/legacy-retirement`; Network owns handler execution, adapters are pure decorations, channel-chained AppCons continue the cascade envelope)
- [x] carry `envelope.chain` across process transports natively (0.20, `feat/chain-transport`): socket.io duplex wire envelope + koa inbound `traceparent` continuation; boundary primitives + `createTransport` in utils; `hop.via` phase tagging; `Network.mirror` + `onProceed`; §9 normative — see `VISION.md` §1
- [x] transport conformance kit `@tao.js/transport-tck` — executable ENVELOPE-SPEC §9 + transport invariants; custom transports prove adherence against a loopback link
- [x] remove the deprecated `TaoLogger` re-export from `@tao.js/utils` — done in 0.21 (utils no longer depends on telemetry at all)
- [x] Stryker configs for `@tao.js/telemetry` + `@tao.js/opentelemetry` (both at 100% score; `pnpm test:mutation:telemetry` / `pnpm test:mutation:opentelemetry`)
- [ ] transfer ownership to tao-land
- [ ] implement TAO.md (spec/template + tooling for consuming apps — the app's TAO: Space + Protocols, `MESH-SPEC.md` §3; declared mode ships like a package)
- [ ] implement a Go lib for the network — a mesh node, not a port: build to `ENVELOPE-SPEC.md` §9/§§13–15 + `MESH-SPEC.md` (propagation + invocation edges, lifecycle, kits), with a cross-language TCK run as the proof
- [ ] implement Schema parsing/validation layer hooks for messages in TS
