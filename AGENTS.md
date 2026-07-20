# AGENTS.md

Living notes for AI agents working on **this** monorepo (`tao.js` — the library itself). Append to **Agent notes** when you learn something durable.

This is not `TAO.md`. In apps that _use_ `@tao.js/*`, `TAO.md` is the intentional artifact that documents that app’s TAO messages, their purpose, and the protocol between them. An app’s `AGENTS.md` should point agents at that app’s `TAO.md`.

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

Three handler phases (order matters), constants exported as `INTERCEPT`, `ASYNC`, `INLINE`:

1. **Intercept** — first; truthy return stops later phases. Returning an `AppCtx` replaces/forwards that context.
2. **Async** — kicked off after intercepts pass; run outside the caller’s sync flow; may return an `AppCtx` to set later.
3. **Inline** — same execution context as the signal; returned `AppCtx` values are collected then set.

Register / unregister on a Kernel:

- `addInterceptHandler` / `removeInterceptHandler`
- `addAsyncHandler` / `removeAsyncHandler`
- `addInlineHandler` / `removeInlineHandler`

Trigram match args accept short or long keys; omitted parts = wildcards.

### Kernel and Network

| Export            | Role                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **`Network`**     | Handler registry + middleware; `setCtxControl` / `setAppCtxControl` dispatch                           |
| **`Kernel`**      | App-facing API over a Network (`setCtx`, `setAppCtx`, handler add/remove, `asPromiseHook`, `clone`, …) |
| **default `TAO`** | Shared `new Kernel()` singleton                                                                        |

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

`Kernel` wires itself into its Network via middleware that calls `AppCtxHandlers.handleAppCon`. Prefer **Kernel** APIs in application code; use **Network** when building adapters (utils, bridges).

### Envelope & decorations (the signal plane)

Read **ENVELOPE-SPEC.md** before touching Network/Kernel internals or any
utils adapter. Summary of the contract:

- Every v2 cascade carries an **envelope** with three scopes: `cascade`
  (the legacy `control` object, one shared reference for the whole cascade
  — `channelId`, transponder `signal`/`signalled` live here), `hop` (reset
  every hop — `Source`'s echo-suppression marker), and `chain` (derived per
  hop by registered reducers — trace context).
- `network.enter(appCtx, { cascade, hop, chain })` is the v2 entry gate;
  the Network owns forwarding (chained AppCons dispatch **exactly once** in
  core). `Kernel.setCtx/setAppCtx` and the utils adapters enter this way.
- `network.decorate({ name, onDispatch, onForward, onReturn, chain })` is
  the additive adapter interface: observe dispatches, mirror chained
  AppCons (never re-enter main dispatch), settle non-AppCtx handler
  returns, derive namespaced chain state. Throwing decorations never break
  dispatch. Returns a dispose fn.
- `setCtxControl`/`setAppCtxControl` **with an explicit `forwardAppCtx`**
  is the frozen legacy path — bit-for-bit pre-envelope behavior.
- `AppCtxHandlers.handleAppCon(ac, setAppCtx, control, hooks)` — optional
  `hooks.onReturn(phase, value, ac)` receives non-AppCtx handler returns
  and errors (phases INTERCEPT/ASYNC/INLINE/ERROR); without hooks the loop
  is bit-for-bit legacy (errors rethrow).
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

Promise-style settle (inline handlers under the hood):

```js
const wait = TAO.asPromiseHook({
  resolveOn: [{ t: 'User', a: 'View', o: 'Portal' }],
  rejectOn: [{ t: 'User', a: 'Error', o: 'Portal' }],
});
await wait({ t: 'User', a: 'Find', o: 'Portal' }, { User: { id: '1' } });
```

For isolated tests, prefer `new Kernel()` over the shared default `TAO`.

---

## 4. Package map (this monorepo)

| npm name                          | Directory                           | Purpose                                                                                                                                                                      |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tao.js/core`                    | `packages/tao`                      | Kernel, Network, AppCtx, default `TAO`, handler constants                                                                                                                    |
| `@tao.js/utils`                   | `packages/tao-utils`                | Signal-network building blocks: `Channel`, `Source`, `Transponder`, `Transceiver`, `trigramFilter`, `seive`, bridges / transfer / forward-chain / logger                     |
| `@tao.js/react`                   | `packages/react-tao`                | React adapter: `TaoProvider` (`Provider` deprecated alias), handlers (`DataHandler`, `RenderHandler`, `SwitchHandler`, …), hooks (`useTaoContext`, `useTaoInlineHandler`, …) |
| `@tao.js/router`                  | `packages/tao-router`               | URL routing ↔ AppCons (`route`, default `init`) — legacy TAO-native bridge                                                                                                  |
| `@tao.js/routing-core`            | `packages/tao-routing-core`         | Route-entry → AppCon contract (`createImportLoader`, `applySignal`, hook factories)                                                                                          |
| `@tao.js/routing-react-router`    | `packages/tao-routing-react-router` | React Router adapter (`importLoader`, `useLoaderSignal`)                                                                                                                     |
| `@tao.js/routing-tanstack-router` | `packages/tao-routing-tanstack`     | TanStack Router adapter (`importLoader`, `useLoaderSignal`)                                                                                                                  |
| `@tao.js/routing-next`            | `packages/tao-routing-next`         | Next.js adapter (`importLoader`, `enterRoute`, `useRouteSignal`)                                                                                                             |
| `@tao.js/telemetry`               | `packages/tao-telemetry`            | Telemetry: causal `Tracer` (pure Network decoration), `TaoLogger` (moved from utils; deprecated re-export remains), sinks, W3C traceparent helpers          |
| `@tao.js/opentelemetry`          | `packages/tao-opentelemetry`        | OpenTelemetry exporter sink for `@tao.js/telemetry` records (spans with causal parentage; api-only dependency)                                                   |
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
- Built outputs: `dist` (ESM), `lib` (CJS), sometimes `bundles/` (UMD)

### Commands (repo root)

```sh
pnpm test                          # nx run-many test (excludes patois.*)
pnpm build                         # nx run-many build
pnpm lint                          # nx run-many lint

pnpm nx test @tao.js/core          # one project
pnpm nx build @tao.js/core
pnpm nx run-many -t test -p @tao.js/core,@tao.js/utils
```

Root scripts also exclude `patois.*` from aggregate test/build unless you target them explicitly.

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
5. **Remove deprecated surface (`~0.18` or `1.0`)** — Drop `context` on `RenderHandler`, remove or rehome `DataConsumer`, delete warn paths. Call out as breaking in release notes (0.x courtesy).

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

- **2026-07-19** — `@tao.js/react`: prefer named export `TaoProvider`; `Provider` remains a deprecated alias (dev once-warning via `deprecations.js`). Default export of `src/Provider.js` is `TaoProvider`.
- **2026-07-18** — Host-router adapters: `@tao.js/routing-core` (signal apply + `createImportLoader` + React hook factories without importing React) and peer adapters `@tao.js/routing-react-router`, `@tao.js/routing-tanstack-router`, `@tao.js/routing-next`. Prefer these over investing in legacy `@tao.js/router`. Mutation: `pnpm test:mutation:routing-*`.
- **2026-07-18** — Envelope/decoration redesign implemented on `feat/network-envelope` per ENVELOPE-SPEC.md (spec committed first; production surveys of kettleos + tidy.dev embedded in §10 with eight normative invariants). Core: `Network.enter` hop engine (dispatch-once, cascade/hop/chain scopes), `Network.decorate`, `AppCtxHandlers` settlement hook, legacy `setCtxControl`+forward path frozen. Utils adapters migrated (Channel = cascade + onForward mirror; Source/Relay = hop-scope origin marker, Relay's unbound-forward bug fixed; Transponder = cascade entry, chains now propagate on bare kernels; Transceiver = settlement hook, `captureSignal` fork deleted). Adapters throw a clear error on pre-envelope cores (mixed-version installs are real — tidy.dev runs core 0.16.0 with utils 0.16.2; set the peerDependency floor when versions are cut at release). New `@tao.js/telemetry` (+ `@tao.js/opentelemetry` exporter): tracing is a pure decoration — full causal trees for kernel/channel/transponder entries with ZERO instrumentation; one tracer per network (chain key exclusivity). `TaoLogger` moved utils → telemetry with a deprecated re-export left in utils (utils gained a runtime dep on telemetry using the `file:` protocol (repo convention). Do NOT use `workspace:` protocol here — pnpm then isolates utils behind a store copy with its own @tao.js/core instance, breaking single-instance `instanceof AppCtx` sharing inside the workspace (found via tools/smoke). Release NOTE: `file:` deps are not rewritten on publish — version this dependency when cutting releases). Gotchas learned: white-box utils tests assert threading mechanics, not just semantics — rewrite intent, don't delete; Stryker `inPlace: true` mutates sources during runs (don't git-operate or run other suites on that package concurrently); jest 30 fails tests on unhandled rejections (assert legacy rethrow via the dispatch promise instead); channel-attached handler chains still re-enter with a fresh cascade (frozen Channel semantic — trace shows them as new roots). Final mutation scores: core 99.70% (0 survivors), utils 100.00% (0 survivors); telemetry 100.00% and opentelemetry 100.00% (Stryker configs wired; thresholds 100 - the first runs surfaced 47 and 3 survivors respectively despite 100% line coverage, all killed).

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
- **2026-07-16** — Renamed this file from `TAO.md` → `AGENTS.md`. Reserve `TAO.md` for app repos that document their message protocol; see `FUTURE.md`.
- **2026-07-16** — `@tao.js/core` default export is a shared `Kernel` instance named `TAO`. `Network` is lower-level; app code and most adapters should use `Kernel` / `TAO`. Wildcard AppCons are ignored on `setCtx`/`setAppCtx` unless `new Kernel(true)`.
- **2026-07-16** — `Kernel.channel(...)` exists but looks unfinished vs `@tao.js/utils` `Channel` (prefer utils `Channel` for real channeling).
- **2026-07-16** — Lerna → Nx migration complete on current branch (Nx 23). Several packages (`connect`, `feature`, `path`) remain private stubs unrelated to the migration.
- **2026-07-16** — See `FUTURE.md` for roadmap (TS wrapper, React 19, docs rewrite, ownership transfer, etc.).
