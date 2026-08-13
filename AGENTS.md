# AGENTS.md

Living notes for AI agents working on **this** monorepo (`tao.js` — the library itself). Append to **Agent notes** when you learn something durable.

This is not `TAO.md`. In apps that _use_ `@tao.js/*`, `TAO.md` is the intentional artifact that documents that app’s TAO — its declared **Space** (Terms, Actions, Orients) and its **Protocols** (the declared signal paths through it); see [`MESH-SPEC.md` §3](./MESH-SPEC.md#3-the-space-and-the-apps-tao). An app’s [`AGENTS.md`](./AGENTS.md) should point agents at that app’s `TAO.md`.

For the case that TAO fits agentic programming — and the checklist to fully deliver on it — see [`AGENTIC.md`](./AGENTIC.md).

Canonical docs site content lives under `packages/docs` (published as [tao.js.org](https://tao.js.org)). Prefer **source + tests** over marketing copy when APIs disagree.

---

## 1. What TAO is

TAO is a small DSL for building apps as a **reactive signal network** of semantic business events.

An event is a **trigram** — three strings: **T**erm / **A**ction / **O**rient(ation). Setting an **Application Context** (AppCon / `AppCtx`) on a **Kernel** (or the default `TAO` singleton) runs matching **handlers**. Handlers can chain by returning another `AppCtx`.

This repo implements that in JavaScript as `@tao.js/*` packages (Nx + pnpm monorepo).

---

## 2. Core concepts

### Trigrams (term / action / orient)

| Aspect     | Meaning                                         | Short keys     |
| ---------- | ----------------------------------------------- | -------------- |
| **Term**   | The thing (domain entity)                       | `t` / `term`   |
| **Action** | The operation on that thing                     | `a` / `action` |
| **Orient** | Perspective / role / surface of the interaction | `o` / `orient` |

Example trigram: `{ t: 'User', a: 'Find', o: 'Portal' }` (same as `{ term, action, orient }`).

Missing or empty parts, or `'*'`, are **wildcards** (`WILDCARD` in `@tao.js/core`). Concrete AppCons set on the network must not be wild unless the Kernel was constructed with `canSetWildcard = true`.

### AppCtx

`AppCtx` is a concrete Application Context: trigram + optional **data** (`datum` / `.data`).

```js
import { AppCtx } from '@tao.js/core';

new AppCtx('User', 'Find', 'Portal');
new AppCtx('User', 'Find', 'Portal', { User: { id: '42' } });
new AppCtx('User', 'Find', 'Portal', userObj); // keyed under term name when a single non-tuple object

ac.t;
ac.a;
ac.o;
ac.data;
ac.unwrapCtx(); // { t, a, o }
ac.unwrapCtx(true); // { term, action, orient }
```

Key format used internally: `` `${term}|${action}|${orient}` `` (`AppCtxRoot.getKey`).

### Handlers

Handlers are plain functions:

```js
function handler(tao, data) {
  // tao === { t, a, o }
  // data === always an object (may be {})
}
```

Three handler phases — the one universal priority Intercept → Async → Inline is contract; ordering _within_ a phase is not (chain trigrams for sequence; [`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract)) — constants exported as `INTERCEPT`, `ASYNC`, `INLINE`:

1. **Intercept** — first; truthy return stops later phases. Returning an `AppCtx` replaces/forwards that context.
2. **Async** — out-of-band side effects. Paradigm contract: once a signal passes the intercepts, delivery to **all** matching async handlers is **committed** — nothing the inline phase does can gate or affect it ([`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract): a commitment ordering, not a scheduling promise). This engine realizes it by calling every async handler before any inline handler runs (enqueued in registration order — the scheduling is implementation detail) — but the calls are scheduled on the event loop, never executed in the entrant's synchronous stack, and the engine **never awaits them** (queue-order priority, not synchronous invocation) — completion timing is deliberately unobservable and must not affect inline serialization. The Promise plumbing is implementation, not contract. May return an `AppCtx`, which enters as a new hop (`hop.via: 'Async'`) whenever it resolves. (The 0.20 fix defers the call itself — `Promise.resolve().then(() => asyncH(...))` + one queue yield before inline — so sync throws are inherently rejections and `setCtx` never executes side-effect handlers in the caller's frame; the original `Promise.resolve(asyncH(...))` evaluated the call before any promise existed, a leak dating to the prototype port.)
3. **Inline** — runs after async initiation; returned `AppCtx` values are collected then set. (In this engine, same execution context as the signal — degenerate-edge behavior, not paradigm: the portable guarantee is settlement, [`TAO-SPEC.md` §§3–4](./TAO-SPEC.md#3-the-phase-contract).)

Register / unregister on a Kernel:

- `addInterceptHandler` / `removeInterceptHandler`
- `addAsyncHandler` / `removeAsyncHandler`
- `addInlineHandler` / `removeInlineHandler`

Trigram match args accept short or long keys; omitted parts = wildcards.

### Kernel and Network

| Export            | Role                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| **`Network`**     | Handler registry + dispatch: `enter()` hop engine + `decorate()` adapter interface    |
| **`Kernel`**      | App-facing veneer over a Network (`setCtx`, `setAppCtx`, handler add/remove, `clone`) |
| **default `TAO`** | Shared `new Kernel()` singleton                                                       |

```js
import TAO, {
  Kernel,
  Network,
  AppCtx,
  INTERCEPT,
  ASYNC,
  INLINE,
} from '@tao.js/core';
```

Signal a context:

```js
TAO.setCtx({ t: 'User', a: 'Find', o: 'Portal' }, { User: { id: '42' } });
TAO.setAppCtx(new AppCtx('User', 'Find', 'Portal', { User: { id: '42' } }));
```

The Network owns handler execution (as of 0.19: `_dispatch` invokes `AppCtxHandlers.handleAppCon` directly; there is no middleware). Prefer **Kernel** APIs in application code; use **Network** `decorate()` when building adapters (utils, bridges).

### Envelope & decorations (the signal plane)

Read [**TAO-SPEC.md**](./TAO-SPEC.md) first — the paradigm
([datum contract §2](./TAO-SPEC.md#2-the-datum-contract),
[phase contract §3](./TAO-SPEC.md#3-the-phase-contract),
[dispatch lifecycle §4](./TAO-SPEC.md#4-the-dispatch-lifecycle),
[observation plane §5](./TAO-SPEC.md#5-the-observation-plane),
[envelope scopes §6](./TAO-SPEC.md#6-the-envelope-scopes),
[wire contract §7](./TAO-SPEC.md#7-the-wire-contract),
[invariants §8](./TAO-SPEC.md#8-invariants)), extracted standalone for
1.0. Then [**ENVELOPE-SPEC.md**](./ENVELOPE-SPEC.md) before touching
Network/Kernel internals or any utils adapter — it is the JS engine's
design record, including
[§10](./ENVELOPE-SPEC.md#10-behavioral-invariants) (the engine's
invariant record with its paradigm/implementation scope split).
[**MESH-SPEC.md**](./MESH-SPEC.md) layers the mesh floor above the
paradigm. Summary of the JS engine's contract:

- Every cascade carries an **envelope** with three scopes: `cascade` (the
  `control` object, one shared reference for the whole cascade —
  `channelId`, transponder `signal`/`signalled` live here), `hop` (reset
  every hop — `Source`'s echo-suppression marker), and `chain` (derived per
  hop by registered reducers — trace context).
- `network.enter(appCtx, { cascade, hop, chain, forward })` is the only
  entry gate (0.19 removed `use`/`stop`, `setCtxControl`/`setAppCtxControl`,
  `Kernel.forwardAppCtx`/`asPromiseHook`); the Network owns handler
  execution and forwarding (chained AppCons dispatch **exactly once** in
  core). The `forward` option is composition plumbing: adapters mirroring a
  cascade onto a private network pass the main hop engine's continuation so
  private chains continue the cascade envelope (Channel, Transceiver,
  seive).
- `network.decorate({ name, onDispatch, onForward, onReturn, chain })` is
  the additive adapter interface: observe dispatches
  (`onDispatch(ac, envelope, handler, forward)`), mirror chained AppCons
  (`onForward(nextAc, envelope, { from, forward })` — never re-enter main
  dispatch), settle non-AppCtx handler returns, derive namespaced chain
  state. Throwing decorations never break dispatch. Returns a dispose fn.
  `Channel` exposes the same contract for its private network
  (`Channel.decorate`) plus channel-scoped entry (`Channel.enter`).
- `AppCtxHandlers.handleAppCon(ac, setAppCtx, control, hooks)` — optional
  `hooks.onReturn(phase, value, ac)` receives non-AppCtx handler returns
  and errors (phases INTERCEPT/ASYNC/INLINE/ERROR); without hooks errors
  rethrow (pre-envelope parity).
- End-to-end proof lives at `tools/smoke/socketio-envelope-smoke.cjs`
  (real socket.io round-trip: per-client reply routing, no cross-client
  leak, bidirectional reflex, tracer linkage). Run with
  `node tools/smoke/socketio-envelope-smoke.cjs` after `pnpm build`.

---

## 3. Minimal usage (matches `@tao.js/core`)

```js
import TAO, { AppCtx } from '@tao.js/core';
// or: import { Kernel } from '@tao.js/core'; const tao = new Kernel();

TAO.addInlineHandler({ t: 'User', a: 'Find', o: 'Portal' }, (tao, data) => {
  const user = data.User;
  // …load user…
  return new AppCtx('User', 'View', 'Portal', { User: user });
});

TAO.addAsyncHandler({ a: 'Find' }, async (tao, data) => {
  // wildcard on term/orient — fires for any Find
});

TAO.addInterceptHandler(
  { t: 'User', a: 'Delete', o: 'Portal' },
  (tao, data) => {
    if (!data.auth?.ok) return true; // swallow
    // return new AppCtx(...) to redirect
  },
);

TAO.setCtx({ t: 'User', a: 'Find', o: 'Portal' }, { User: { id: '1' } });
```

Promise-style settle (`Kernel.asPromiseHook` was removed in 0.19 — use a
`Transponder` from `@tao.js/utils`, which resolves with the first handled
AppCon of the cascade; `Transceiver` when handlers should control the
Promise). Current behavior note: first-descendant resolution is a race
under the [`TAO-SPEC.md` §3](./TAO-SPEC.md#3-the-phase-contract) unordered contract — pre-1.0, wrappers
move to declared responses ([`MESH-SPEC.md` §4](./MESH-SPEC.md#4-protocols)):

```js
import { Transponder } from '@tao.js/utils';

const transponder = new Transponder(TAO);
const ac = await transponder.setCtx(
  { t: 'User', a: 'Find', o: 'Portal' },
  { User: { id: '1' } },
);
```

For isolated tests, prefer `new Kernel()` over the shared default `TAO`.

---

## 4. Package map (this monorepo)

| npm name                          | Directory                           | Purpose                                                                                                                                                                      |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tao.js/core`                    | `packages/tao`                      | Kernel, Network, AppCtx, default `TAO`, handler constants                                                                                                                    |
| `@tao.js/utils`                   | `packages/tao-utils`                | Signal-network building blocks: `Channel`, `Source`, `Transponder`, `Transceiver`, `trigramFilter`, `seive`, bridges / transfer / forward-chain / wire                       |
| `@tao.js/react`                   | `packages/react-tao`                | React adapter: `TaoProvider` (`Provider` deprecated alias), handlers (`DataHandler`, `RenderHandler`, `SwitchHandler`, …), hooks (`useTaoContext`, `useTaoInlineHandler`, …) |
| `@tao.js/router`                  | `packages/tao-router`               | URL routing ↔ AppCons (`route`, default `init`) — legacy TAO-native bridge                                                                                                  |
| `@tao.js/transport-tck`           | `packages/tao-transport-tck`        | Transport conformance kit: executable ENVELOPE-SPEC §9 wire contract + transport invariants (`runTransportCompliance`)                                                       |
| `@tao.js/routing-core`            | `packages/tao-routing-core`         | Route-entry → AppCon contract (`createImportLoader`, `applySignal`, hook factories)                                                                                          |
| `@tao.js/routing-react-router`    | `packages/tao-routing-react-router` | React Router adapter (`importLoader`, `useLoaderSignal`)                                                                                                                     |
| `@tao.js/routing-tanstack-router` | `packages/tao-routing-tanstack`     | TanStack Router adapter (`importLoader`, `useLoaderSignal`)                                                                                                                  |
| `@tao.js/routing-next`            | `packages/tao-routing-next`         | Next.js adapter (`importLoader`, `enterRoute`, `useRouteSignal`)                                                                                                             |
| `@tao.js/telemetry`               | `packages/tao-telemetry`            | Telemetry: causal `Tracer` (pure Network decoration), `TaoLogger`, sinks, W3C traceparent helpers                                                                            |
| `@tao.js/opentelemetry`           | `packages/tao-opentelemetry`        | OpenTelemetry exporter sink for `@tao.js/telemetry` records (spans with causal parentage; api-only dependency)                                                               |
| `@tao.js/socket.io`               | `packages/tao-socket-io`            | Wire a Kernel to socket.io (`wireTaoJsToSocketIO`)                                                                                                                           |
| `@tao.js/koa`                     | `packages/koa-tao`                  | Expose a TAO network over HTTP via Koa middleware                                                                                                                            |
| `@tao.js/http-client`             | `packages/tao-http-client`          | HTTP client for a TAO HTTP server (`TaoHttpClient`) — private                                                                                                                |
| `@tao.js/connect`                 | `packages/tao-connect`              | Connect/Express middleware — **private / incomplete**                                                                                                                        |
| `@tao.js/feature`                 | `packages/tao-feature`              | Dynamic feature loading — **private / incomplete**                                                                                                                           |
| `@tao.js/path`                    | `packages/tao-path`                 | Config-driven value paths — **private / incomplete**                                                                                                                         |
| `docs`                            | `packages/docs`                     | GitBook-style docs site sources                                                                                                                                              |
| examples                          | `examples/*`                        | e.g. `patois.api`, `patois.web`                                                                                                                                              |

Nx project names match package names (e.g. `@tao.js/core`). Package manager: **pnpm**; orchestration: **Nx 21**.

---

## 5. Conventions for agents in this repo

### Source of truth

- **Do not invent APIs.** Confirm exports in `packages/*/src/index.js` and behavior in `packages/*/test/**`.
- Public surface of core: default `TAO`, `{ AppCtx, Network, Kernel, INTERCEPT, ASYNC, INLINE }`.
- Trigram args: support both `{ t, a, o }` and `{ term, action, orient }` — don’t require only one style.
- Handler signature is `(tao, data)` with `tao = { t, a, o }`, not a single event object.

### Layout

- Library code: `packages/<dir>/src/`
- Tests: `packages/<dir>/test/*.spec.js` (Jest via `@nx/jest`)
- Built outputs: `dist` (ESM), `lib` (CJS + emitted `.d.ts`), sometimes `bundles/` (UMD)

### TypeScript declarations (0.21+)

Every release-group package publishes its own `.d.ts`, **emitted from the
JSDoc** — never hand-written. Per package: `tsconfig.types.json` (extends
`config/tsconfig.types.json`), a `build:types` script (`tsc -p
tsconfig.types.json`, declaration-only into `lib/`), chained into `build`,
and `"types": "lib/index.d.ts"`. `checkJs` stays ON as the JSDoc/behavior
drift gate — fix type errors by correcting the JSDoc (or a comment-cast
`/** @type {X} */ (expr)` at duck-typed spots), not by weakening public
signatures to `any`. Rules learned wiring it:

- `@param {Object}` emits as `any` — name a typedef (or a structural shape)
  instead.
- Modules reachable from an index `export *` must reference cross-package
  types **inline** (`import('@tao.js/core').Kernel`) — top-level typedef
  aliases are exported from the module's d.ts and collide across `export *`
  sources (TS2308).
- Duck-typed acceptance is typed as a structural shape at its origin:
  `NetworkSurface` in utils (`typeof x.enter === 'function' ? x :
x._network` convention), `TraceableSurface` in telemetry. Public params
  reference those, prose keeps the Kernel/Network framing.
- Shared shapes get typedefs at their origin module and are re-exported
  from `src/index.js` via a comments-only typedef block (see
  `packages/tao/src/index.js`).
- Clean-room proof: `pnpm run test:types` (tools/types-consumer) packs all
  13 tarballs, installs them with the host libs in a scratch project, and
  compiles strict typical usage with `IsAny` guards so a declaration that
  degrades to `any` fails. Run it (after `pnpm build`) before every
  release.

### Commands (repo root)

```sh
pnpm test                          # nx run-many test (excludes patois.*)
pnpm build                         # nx run-many build
pnpm lint                          # nx run-many lint
pnpm run test:types                # clean-room d.ts consumer check (after pnpm build)

pnpm nx test @tao.js/core          # one project
pnpm nx build @tao.js/core
pnpm nx run-many -t test -p @tao.js/core,@tao.js/utils
```

Root scripts also exclude `patois.*` from aggregate test/build unless you target them explicitly.

`nx test` does **not** depend on build — package specs import sibling
packages through their built `lib/`, so run `pnpm build` first in a fresh
checkout/worktree or cross-package suites fail confusingly (see the
2026-07-24 agent note on worktree fall-through).

### Commit messages

This repo keeps a **Commitizen-compatible message contract** for changelog history. The interactive wizard (`pnpm run commit` / husky `prepare-commit-msg`) needs a TTY and is for humans. Agents should use `git commit -m` with the same shape; husky `commit-msg` validates it (not Cursor-specific — any non-interactive Git client).

Required format:

```text
type(scope): subject

Optional longer body.

Affected packages:
- @tao.js/core
- @tao.js/react
```

- **Types:** `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore`
- **Scope:** optional (e.g. `nx`, `hooks`, package short name)
- **Affected packages:** required heading; list workspace package names (`packages/*` / `examples/*` `name` fields). Omit bullets for root-only tooling/docs.
- Optional: `ISSUES CLOSED: #123`, `BREAKING CHANGE: …`
- Hooks: `pre-commit` → lint-staged; `prepare-commit-msg` → wizard if TTY and no `-m`; `commit-msg` → `scripts/validate-commit-msg.js`

### Editing guidance

- Match existing style (plain JS classes in core; Jest + mocks in tests). Prefer function components + hooks for new `@tao.js/react` Current API work (see Switch/Render modernization).
- Do not rewrite the docs site (`packages/docs`) unless asked.
- Keep this file accurate: if you change a public API, update the relevant section here.
- Cross-doc §-references in the root specs are deep links to heading anchors. The link check runs in lint-staged on every commit — **a commit fails if a staged change leaves any root-doc link or anchor broken** (e.g., a heading rename orphaning inbound links). Fix by updating the links it names, or run `pnpm run docs:links:write` to convert plain references (a linkified doc name followed by a bare `§N`) into deep links; `pnpm run docs:links` runs the same check standalone. Tool: `tools/docs/link-spec-sections.mjs`.

### `@tao.js/react` data-context migration (agents)

Agreed multi-step plan for `DataHandler` / data consumption. Follow this order; do **not** merge steps unless the user explicitly asks.

#### Target end state

- **Tree-scoped named data:** each `DataHandler` is a provider in the React tree. `name` is a lookup key along the **ancestor chain** (nearest match wins / inner shadows outer). Sibling subtrees do not share a global bag.
- **Any descendant** may read data (not only `RenderHandler`) via hooks: `useTaoData('user')`, optional `useTaoData()` = nearest provider value.
- **`RenderHandler` child stays `(tao, data) => …`** — AppCon signal only. No positional args appended from data handlers.
- **Not automatic props** — consumers use hooks (or pass props themselves). Optional later: thin `TaoData` child / `withTaoData` HOC; not the default.
- **Avoid** importable context-token boilerplate as the app default (bad DX for User + Prefs). Optional tokens may exist as an escape hatch only.

#### Implementation steps (do in order)

1. **Modernize like-for-like (hooks)** — Port `DataHandler` / `createContextHandler` to function components + `useTaoInlineSubscription` (same pattern as Switch/Render). Preserve current bag behavior and public contracts so we have a working baseline if the tree redesign slips.
2. **Ship tree-scoped lookup (`~0.17`)** — Change storage/lookup to ancestor walk by `name`. Prefer keeping `name` + `useTaoData('name')` so most call sites migrate by behavior, not renames. Alias `useTaoDataContext` → `useTaoData` during overlap.
3. **Soft-deprecate awkward consume APIs (same release as step 2)** — Keep working, warn in development **once per process** (module flag), JSDoc `@deprecated`, changelog + docs lead with the new API:
   - `RenderHandler` `context` prop and extra render-prop args `(tao, data, …ctx)`
   - `DataConsumer` rest-arg render prop
4. **Overlap window** — At least one published release where old + new coexist; migrate in-repo examples (`patois.web`, `react19-smoke`) and tests to hooks.
5. **Remove deprecated surface** — DONE in 0.21: dropped `context` on `RenderHandler` (+ positional ctx args), `DataConsumer`, the `Provider` alias, `useTaoDataContext`, the Provider data bag (Context is `{ TAO }`-only; DataHandler provides only the DataLayerContext stack), the warn infra (`deprecations.js`), and all `propTypes` + the `prop-types` dependency. Called out as breaking in the 0.21 changelog.

#### Deprecation rules for agents

- **Do not** hard-break bag/`context` in the same PR as the first tree ship without an overlap path.
- **Do not** park data-bag APIs under `@tao.js/react/orig` (that entry is Adapter/Reactor legacy only).
- **Do not** warn every render — once-per-session/`NODE_ENV === 'development'` only.
- **Do not** invent a forever `@tao.js/react/legacy-data` entry point unless the user asks.
- When editing call sites: prefer  
  `const user = useTaoData('user')` inside a child component  
  over `context="user"` / `(tao, data, user) => …`.
- Codemod is optional later; string `name` preservation makes manual migration small.
- After any public API change: update this section, package README migration blurb, and tests (coverage + later mutation on `@tao.js/react`).

#### Migration cheat sheet (old → new)

```text
DataHandler name="user" …          → keep (lookup becomes tree-scoped)
useTaoDataContext('user')          → useTaoData('user')  (alias OK during overlap)
<RenderHandler context="user">
  {(tao, data, user) => …}         → <RenderHandler>{(tao, data) => <Child/>}</RenderHandler>
                                     with useTaoData('user') inside Child
<DataConsumer context={['a','b']}> → useTaoData('a'); useTaoData('b');
```

### Knowledge handoff

Append durable findings to **Agent notes** below (API quirks, migration status, “don’t do X”). Prefer short dated bullets over essays.

---

## 6. Agent notes

_Append learnings for the next agent. Newest first._

- **2026-08-09** — **The paradigm was extracted to [`TAO-SPEC.md`](./TAO-SPEC.md)** (1.0 extraction, on the PR #66 branch): the portable contract — grammar, datum contract, phase contract, dispatch lifecycle, observation plane, envelope scopes, wire contract, invariants — now lives there, free of implementation history. ENVELOPE-SPEC is the JS engine's design record; its §9/§13/§14/§15 headings remain as pointer stubs so old references resolve, and §10 stays as the engine's invariant record with the scope split. Cite [`TAO-SPEC.md`](./TAO-SPEC.md) for paradigm claims, [`ENVELOPE-SPEC.md`](./ENVELOPE-SPEC.md) for engine behavior. The 2026-08-08 note below predates the extraction — its §-references map: §13→TAO-SPEC §2, §14→§3, §15→§4.

- **2026-08-08** — 1.0 spec train (docs-only): new **MESH-SPEC.md** (the TAO Mesh Profile — three layers, two edge kinds, distributed phase semantics, dispatch lifecycle, delivery identity, partition floor, capability vocabulary) and ENVELOPE-SPEC amendments (**§13 datum contract, §14 paradigm phase contract, §15 dispatch lifecycle**, §10 scope split). Load-bearing corrections an agent must not regress: the paradigm intercept contract is **unordered with conditional completeness** (proceed = complete all-falsey set; halt decisive; redirect = fresh dispatch facing its own gates) — the engine's serialized loop and suppression are implementation detail, unobservable, never to be relied on; **no prioritized handlers ever** — ordering is expressed by chaining trigrams (Protocols), never registration; **datum is an immutable value** (§13 — enrichment by returning a new AppCtx; structural sharing licensed); **no client await** — `setCtx` returns void forever, wrappers observe; four lifecycle events (received/concluded/dispatched/settled) are observation waypoints, never control flow. Spec style rule: every contract section carries a normative "Plainly" block. VISION §2 was rewritten (the old home-authority/sequential-veto record was superseded — it had read the serialized JS engine back into the paradigm). Vocabulary: Space (axes: Terms/Actions/Orients; points/slices), Protocol (declared path; "chain" stays the runtime word), the app's TAO (Space + Protocols, declared mode as an installable package).

- **2026-07-24 (b)** — Coverage measurement overhauled for 0.21 (see the commit "build(coverage)"). Facts that cost hours: (1) a **stale `stryker-tmp/` sandbox left in a package dir poisons everything** — jest haste-maps the sandbox copies, doubling suites and scrambling coverage attribution; if numbers look insane, `rm -rf packages/*/stryker-tmp` first. (2) The lerna-era root **`.babelrc` injected `babel-plugin-istanbul` in the test env** (so did `babel.config.cjs`) — that double-instrumented every babel-provider coverage run into `cov_x is not a function` crashes; both removed, don't re-add. (3) The **v8 coverage provider keeps only one isolated module copy per test file** — suites built on `jest.isolateModules` (socket.io) lose whole branches; the preset now uses `coverageProvider: "babel"` (istanbul counters merge across copies) and that is the accuracy standard. (4) istanbul honors `/* istanbul ignore */` pragmas, NOT `c8 ignore`; for a default-arg branch the pragma goes **before the parameter name**. (5) The aggregate docs-site report is produced by `tools/coverage/report.cjs` (`pnpm run test:coverage`): per-package JSON coverage merged into one istanbul HTML report at `packages/docs/src/content/coverage`, scoped to the release group. The old `nx run-many --coverage` path fragmented reports into per-package junk dirs (`packages/<p>/packages/docs/...`) and could never aggregate.
- **2026-07-24** — d.ts emission wired for all 13 release packages (see §5 “TypeScript declarations”). Gotchas from the wiring: (1) TS narrowing cannot survive `param = new X(...)` reassignment when X structurally overlaps the param's other union members (AppCtxRoot has a `t` getter, so it IS a `Trigram`) — use a fresh `const`; (2) TanStack's `useLoaderData` typings require an options arg the adapter deliberately omits — comment-cast at the call site, documented; (3) `typescript` is pinned `^5.9.3` (bare `typescript` resolves to the native TS7 compiler, no JS API); (4) @types/react@19 at the root serves react-tao and the routing hooks' emissions. **Worktree fall-through trap:** a worktree nested inside the main repo resolves missing/unbuilt workspace deps through the MAIN repo's `node_modules` (pnpm symlink realpaths escape the worktree) — jest then mixes main-repo builds with worktree sources and `instanceof AppCtx` fails across the two core instances, and tsc type-checks the main repo's untyped bundles. Always `pnpm install && pnpm build` in a fresh worktree before testing.
- **2026-07-19** — `@tao.js/react`: prefer named export `TaoProvider`; `Provider` remains a deprecated alias (dev once-warning via `deprecations.js`). Default export of `src/Provider.js` is `TaoProvider`.
- **2026-07-18** — Host-router adapters: `@tao.js/routing-core` (signal apply + `createImportLoader` + React hook factories without importing React) and peer adapters `@tao.js/routing-react-router`, `@tao.js/routing-tanstack-router`, `@tao.js/routing-next`. Prefer these over investing in legacy `@tao.js/router`. Mutation: `pnpm test:mutation:routing-*`.
- **2026-07-18** — Envelope/decoration redesign implemented on `feat/network-envelope` per ENVELOPE-SPEC.md (spec committed first; eight normative behavioral invariants in §10). Core: `Network.enter` hop engine (dispatch-once, cascade/hop/chain scopes), `Network.decorate`, `AppCtxHandlers` settlement hook, legacy `setCtxControl`+forward path frozen. Utils adapters migrated (Channel = cascade + onForward mirror; Source/Relay = hop-scope origin marker, Relay's unbound-forward bug fixed; Transponder = cascade entry, chains now propagate on bare kernels; Transceiver = settlement hook, `captureSignal` fork deleted). Adapters throw a clear error on pre-envelope cores (mixed-version installs are real — a surveyed app ran core 0.16.0 with utils 0.16.2; set the peerDependency floor when versions are cut at release). New `@tao.js/telemetry` (+ `@tao.js/opentelemetry` exporter): tracing is a pure decoration — full causal trees for kernel/channel/transponder entries with ZERO instrumentation; one tracer per network (chain key exclusivity). `TaoLogger` moved utils → telemetry with a deprecated re-export left in utils (utils gained a runtime dep on telemetry using the `file:` protocol (repo convention). Do NOT use `workspace:` protocol here — pnpm then isolates utils behind a store copy with its own @tao.js/core instance, breaking single-instance `instanceof AppCtx` sharing inside the workspace (found via tools/smoke). Release NOTE: `file:` deps are not rewritten on publish — version this dependency when cutting releases). Gotchas learned: white-box utils tests assert threading mechanics, not just semantics — rewrite intent, don't delete; Stryker `inPlace: true` mutates sources during runs (don't git-operate or run other suites on that package concurrently); jest 30 fails tests on unhandled rejections (assert legacy rethrow via the dispatch promise instead); channel-attached handler chains still re-enter with a fresh cascade (frozen Channel semantic — trace shows them as new roots). Final mutation scores: core 99.70% (0 survivors), utils 100.00% (0 survivors); telemetry 100.00% and opentelemetry 100.00% (Stryker configs wired; thresholds 100 - the first runs surfaced 47 and 3 survivors respectively despite 100% line coverage, all killed).

- **2026-07-18** — `@tao.js/react@0.17.0` on `modernize-react-handlers`: DataHandler/Provider/DataConsumer/createContextHandler are function components; tree-scoped `DataLayerContext` + `useTaoData(name?)`; bag merge kept for deprecated `RenderHandler.context` / `DataConsumer`; dev once-warnings via `deprecations.js`. See §5 migration (steps 1–3 shipped; removal still future).
- **2026-07-18** — `@tao.js/react` `SwitchHandler` / `RenderHandler` modernized to function components (`modernize-react-handlers`). Match table from children each render; Kernel inline subs reconciled via `useTaoInlineSubscription`. Selection by trigram `matchKey` (multi-match / wildcards / array cartesian). Wave = one AppCon (latest wins, not settle-chain union). `shouldRender` stays public; non-RH children always pass through. DataHandler still class — next (migration plan in §5).
- **2026-07-18** — Mutation testing on `@tao.js/koa`: `pnpm test:mutation:koa` (`packages/koa-tao/stryker.config.json`, `inPlace: true`). Score raised from 65.15% → **100%** (203 killed, 0 survived, 0 errors). Key techniques: import the mocked `Channel`/`Transponder`/`Transceiver` directly in the test file to assert exact constructor args (e.g. `Transponder.mock.calls[i][2]` for the `opt.timeout || DEFAULT_TIMEOUT` value) since that value never surfaces in a return value; use the inner `mockTransponderSetCtx` jest.fn (decoupled from its fixed mocked resolved value) to assert the exact `(tao, data)` args `getBodyData` computed, which is otherwise invisible because `ctx.body` only reflects the canned mock return; `getBodyData`'s cascading `if (!data && ...)` guards make most "missing field" tests equivalent-looking (any JS falsy value short-circuits identically) — need a genuinely falsy key (e.g. `opt.json = ''`) paired with a _truthy_ value at that key to make `if(bodyProp && ...)` vs `if(true)`/`||` mutants diverge. Found and fixed a real production bug this way: `handleContext` destructured `getBodyData`'s result without a null-guard, so a body-less `POST /tao/context` (no json/body/configured field) crashed the process on `const { tao, data } = await getBodyData(...)` — fixed with `(await getBodyData(...)) || {}` rather than working around it in tests.

- **2026-07-18** — Mutation testing on `@tao.js/router`: `pnpm test:mutation:router` (`packages/tao-router/stryker.config.json`, `inPlace: true`). Score raised from 57.57% → **100%** (271 killed, 0 survived; thresholds high=95). Key techniques: attach multiple trigrams to the same route node and inspect `router._router.define(path)[0].attached/.defaultData` directly to precisely test `Route/Attach`+`Route/Detach`'s filter/`isMatch(...,exact)` logic; use a genuinely lowercase URL against a wildcard-trigram route to exercise `capitalize()` (an already-capitalized URL segment makes most of its mutants equivalent-looking); `AppCtx`'s `_cleanDatum` auto-wraps positional object data under the term name whenever the object has no key matching that term (so a shared/mutated `pathMatched` reference across multiple attached trigrams shows up under different wrapper keys per trigram — check the exact wrapped shape, e.g. `{ Viewer3: { ... } }`, not the raw merged object).
- **2026-07-18** — Mutation testing on `@tao.js/utils`: `pnpm test:mutation:utils` — score **100%**.
- **2026-07-18** — Mutation testing on `@tao.js/socket.io`: `pnpm test:mutation:socket.io` — score **100%** (Node jest-env; client/server via `window` + `isolateModules`).
- **2026-07-18** — Mutation testing on `@tao.js/react`: `pnpm test:mutation:react` (`packages/react-tao/stryker.config.json`, same `inPlace` + jest-runner pattern as core). Score **100%**. Explicit `testEnvironment: 'jsdom'` required — Stryker does not merge preset env under `perTest` coverage analysis.
- **2026-07-18** — Mutation testing on `@tao.js/core` via Stryker: `pnpm test:mutation:core` (`packages/tao/stryker.config.json`, `inPlace: true`). Score raised to **~99.8%** (behavioral survivors killed; equivalents ignored via `// Stryker disable … : reason`). Thresholds high=95. Reports gitignored under `packages/tao/reports/mutation/`.
- **2026-07-18** — Stryker disable reasons must use `:` not `--`, or the directive is ignored. Disable-inside-`try` does not cover the following `catch` (block scope); put `disable` _before_ the `try`.
- **2026-07-18** — Public packages at **100%** coverage on `test-full-coverage`: core, react, utils, router, socket.io, koa, http-client. `Kernel.channel` still unfinished (`c8 ignore`). Private stubs (`connect`, `feature`, `path`) untested.
- **2026-07-17** — Branch `test-full-coverage`: `@tao.js/core` and `@tao.js/react` at 100% executable coverage. Other public packages raised substantially (utils/router/koa/socket/http-client). `Kernel.channel` is unfinished — `c8 ignore` + prefer `@tao.js/utils` `Channel`. Private stubs (`connect`, `feature`, `path`) still have no real tests.
- **2026-07-17** — `SwitchHandler` must not `setState` from intercept handlers: `Kernel`/`handleAppCon` `await`s intercepts, which yields before inline handlers and can leave `chosenList` empty. Clear/select via inline only (wave key); clone chosen `RenderHandler` with `shouldRender: true` so the first matching AppCon paints. Smoke: `examples/react19-smoke` (build `@tao.js/core` + `@tao.js/react` first).
- **2026-07-17** — `@tao.js/react` on React 19: named data nested on Provider `Context.data[name]` (fixes `useTaoDataContext`); tests on `@testing-library/react` (no enzyme); peers `react`/`react-dom` `^18.2 || ^19`. See `REACT-19-UPGRADE.md`.
- **2026-07-17** — Alpha ladder published: `0.16.3-alpha.nx21` → migrate 22.7.7 → `…nx22` → migrate 23.1.0 → `…nx23` (npm dist-tag `alpha`). Keep custom `tools/release/version-actions.cjs`: Nx 22+ `preserveMatchingDependencyRanges` treats `*` as `>=0.0.0`, which does **not** match prereleases. npm publish with passkey MFA needs a granular token with Bypass 2FA (no TOTP/`--otp`). `patois.web` needs `file:` dep on `@tao.js/utils` for lockfile updates during release.
- **2026-07-17** — Commit hooks are standard husky/Git (not Cursor-specific). Interactive Commitizen needs a TTY; agents use `git commit -m` with `Affected packages:` and `scripts/validate-commit-msg.js` enforces the contract.
- **2026-07-16** — Renamed this file from `TAO.md` → [`AGENTS.md`](./AGENTS.md). Reserve `TAO.md` for app repos that document their message protocol; see [`FUTURE.md`](./FUTURE.md).
- **2026-07-16** — `@tao.js/core` default export is a shared `Kernel` instance named `TAO`. `Network` is lower-level; app code and most adapters should use `Kernel` / `TAO`. Wildcard AppCons are ignored on `setCtx`/`setAppCtx` unless `new Kernel(true)`.
- **2026-07-16** — `Kernel.channel(...)` exists but looks unfinished vs `@tao.js/utils` `Channel` (prefer utils `Channel` for real channeling).
- **2026-07-16** — Lerna → Nx migration complete on current branch (Nx 23). Several packages (`connect`, `feature`, `path`) remain private stubs unrelated to the migration.
- **2026-07-16** — See [`FUTURE.md`](./FUTURE.md) for roadmap (TS wrapper, React 19, docs rewrite, ownership transfer, etc.).
- **2026-07-22** — §12 legacy retirement executed on `feat/legacy-retirement` (0.19.0): the Network owns handler execution (`_dispatch` calls `AppCtxHandlers.handleAppCon` directly; no middleware), and `enter()`/`decorate()` are the entire dispatch surface. Removed: `Network.use`/`stop`, `setCtxControl`/`setAppCtxControl` (+ `envelope.legacy`), `Kernel.forwardAppCtx`/`asPromiseHook`/`channel()` sketch, `TIMEOUT_REJECT`, `concatIterables`, Channel's `use`/`stop`/`handleAppCon`/`forwardAppCtx`/`*Control` branches, Transponder's pre-envelope fallback, Transceiver's legacy forwarding, Source/Relay's `control.source` fallback, Tracer's unlinked-root mode. New composition contract: decorations receive core's continuation — `onDispatch(ac, envelope, handler, forward)`, `onForward(..., { from, forward })`, and `enter(ac, { ..., forward })` for private-network mirrors (Channel/Transceiver/seive) so privately-dispatched chains continue the cascade envelope; `Channel.enter`/`Channel.decorate` are the channel-scoped surface wrapping adapters compose against (Transponder-on-Channel decorates the private network, enters through the channel gate). Semantic fix per §12 step 4: channel-attached handler chains continue the cascade (channel handlers now also observe chains from channel handlers). Bug fixed for free: `Kernel.clone()`/`Channel.clone()` clones now actually dispatch (0.18 clones lost dispatch middleware silently). The old middleware discriminator `typeof x.use === 'function'` is gone — adapters resolve surfaces via `typeof x.enter === 'function' ? x : x._network` and Tracer via `kernel._network || kernel`. Verification: 16 projects green, 100.00% coverage AND 100.00% mutation on core (708 mutants), utils (582), telemetry (405), socket.io smoke 7/7 unchanged. Gotcha: lint-staged stashes unstaged changes when committing, so partial-stage commits of a cross-package cutover test an inconsistent tree — stage the whole cutover in one commit.
- **2026-07-23** — Release-checklist rule learned the hard way (0.19.0 shipped with stale floors, fixed in 0.19.1): `tools/release/version-actions.cjs` deliberately preserves floor-style peer ranges (`>=X`) across releases, so **when a release makes an adapter depend on new core behavior, bump that adapter's `@tao.js/core` peer floor in the same PR** — and "depend" includes **transitive runtime dependence** (koa never calls `Network.mirror`, but the utils `Channel` it instantiates does; a package's floor states its own runtime requirement even where a transitive peer would technically constrain the install) — the runtime guards only check `enter`/`decorate` existence and will NOT catch a core that is envelope-capable but older than the adapter's contract (e.g. utils 0.19 on core 0.18 silently never runs channel/signal handlers because `meta.forward` is undefined and the 0.18 private-network middleware loop is empty).
- **2026-07-23** — 0.20 wire release built on `feat/chain-transport` (spec-first: §4 `hop.via` + `Network.mirror` + `onProceed`, §9 normative). Core: chained hops carry the producing phase (threaded from the three chain sites in `AppCtxHandlers` — the forward's 3rd argument; a prettier-reformatted line silently no-op'd the first sed of `_dispatch`'s coreForward, so ALWAYS assert batch string replacements); `mirror(ac, envelope, forward)` dispatches same-hop with the envelope verbatim (Channel/Transceiver private registries now see real hop/chain); `onProceed` fires post-intercept-pass for veto-respecting emitters. Utils: `wire.js` boundary primitives + `createTransport` duplex helper; Transponder/Transceiver accept entry `{chain}`. socket.io: client on createTransport, server replies via `onProceed` on the per-client Channel (invariant 5 kept; replies carry chain), inbound entries stamp `hop.source` per §9. koa: `chainFromRequest` traceparent continuation in all three middlewares — and two pre-existing bugs fixed: un-awaited `handleContext`/`next()` detached per-request Transponders before they could resolve (every `/tao/context` POST 500'd by timeout). New `@tao.js/transport-tck` (14th release-group member): §9 + transport invariants as an executable kit, meta-tested bidirectionally (conformant loopback passes; 10 sabotaged transports each fail their targeted check). Verification: 17 projects green, 13/13 smoke (ONE traceId per socket round trip, exact cross-process parentage both directions), 100.00% mutation on all 13 packages (core 541+103t, utils 562+47t, koa 218, telemetry 371+3t, tck 235+12t, remainder unchanged-at-100). Gotchas: Stryker `inPlace` on one package poisons concurrent builds/tests of DEPENDENT packages in the same worktree — sequence mutation runs after everything else; babel-provider packages need `/* istanbul ignore */` pragmas (c8 comments are silently inert); istanbul ignore for an object-property arrow must be INLINE in expression position; Stryker disable-next-line does not reach `finally` blocks — restructure to dispose-after-body instead of annotating.
