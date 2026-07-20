TAO is:

- a DSL used to build applications by creating
- semantic business events allowing for a reactive architecture

`TAO.md` (for apps that use tao.js):

- documents the TAO messages in that repo, their purpose, and the protocol used between them
- is an intentional artifact of apps that implement with tao.js
- should be referenced from that app’s `AGENTS.md` so agents implementing there can find it

This repo’s agent guide is `AGENTS.md` (how to work on the tao.js library itself).

TODO

- [x] finish the transformation to nx.js (Nx 23.1.0; alpha ladder `0.16.3-alpha.nx{21,22,23}` on npm `alpha` tag)
- [ ] implement the TypeScript library wrapper
- [x] complete all tests for 100% code coverage
- [x] create a mutation test suite and exercise it (Stryker on all public packages at 100% — `pnpm test:mutation:*`)
- [ ] rewrite documentation site
- [x] update to React 19 implementation for @taojs/react
- [x] `@tao.js/react` data-context 0.17: hooks modernize + tree-scoped `useTaoData` + soft-deprecate `RenderHandler.context`/`DataConsumer` (see `AGENTS.md` §5; removal still open)
- [ ] `@tao.js/react` remove deprecated data consume APIs (`RenderHandler.context`, `DataConsumer`) after overlap window
- [ ] host-router adapters (`@tao.js/routing-core` + react-router / tanstack / next) — first PR open for review; publish into fixed release group when approved
- [x] signal-plane hardening: envelope scopes + Network decorations + settlement hook per `ENVELOPE-SPEC.md` (`feat/network-envelope`); `@tao.js/telemetry` (causal Tracer + TaoLogger) + `@tao.js/opentelemetry`
- [ ] legacy retirement cutover (0.19.0): remove dual-mode dispatch per `ENVELOPE-SPEC.md` §12 — after cutting the backward-compatible 0.18.0
- [ ] carry `envelope.chain` across process transports (socket.io/koa) natively — see `ENVELOPE-SPEC.md` §9; `@tao.js/telemetry` already continues W3C traceparent manually
- [ ] remove the deprecated `TaoLogger` re-export from `@tao.js/utils` after an overlap window
- [x] Stryker configs for `@tao.js/telemetry` + `@tao.js/opentelemetry` (both at 100% score; `pnpm test:mutation:telemetry` / `pnpm test:mutation:opentelemetry`)
- [ ] transfer ownership to tao-land
- [ ] implement TAO.md (spec/template + tooling for consuming apps)
- [ ] implement a Go lib for the network (the envelope scopes in `ENVELOPE-SPEC.md` are the reference protocol)
- [ ] implement Schema parsing/validation layer hooks for messages in TS
