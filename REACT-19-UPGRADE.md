# React 19 upgrade plan (`@tao.js/react`)

Branch: `upgrade-react-19`  
Baseline: `@tao.js/*@0.16.3` on Nx 23 / React **16.14**  
Goal: Support **React 19** for `@tao.js/react` with green tests, fixed DataHandler timing, and updated docs/example smoke path.

**Status (2026-07-17):** Complete through optional work. React **19.2** in monorepo; **86** `@tao.js/react` tests green (RenderHandler / SwitchHandler / withContext covered). Vite smoke: `examples/react19-smoke`. Peers `^18.2 \|\| ^19`.

---

## Current state (audit)

| Area           | Today                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Runtime peers  | `react` / `react-dom` `*` (no floor)                                                                                              |
| Dev / monorepo | React **16.14**, `prop-types`                                                                                                     |
| Library shape  | Class + Context API + hooks; no `findDOMNode` / string refs / unsafe lifecycles                                                   |
| Tests          | Enzyme 16 adapter, RTL v5–8, `@testing-library/react-hooks` (EOL)                                                                 |
| Known bug      | `DataHandler` registers context in `componentDidMount` → children / `useTaoDataContext` can miss data (README “FIX DATA CONTEXT”) |
| Example        | `patois.web`: CRA 2 + `ReactDOM.render` + React 16                                                                                |

**Implication:** Runtime is closer to “works on 19” than the **test stack** and **DataHandler lifecycle** are. Bumping `package.json` alone is not the upgrade.

---

## Goals / non-goals

**In scope**

1. Modernize `@tao.js/react` test stack for React 19.
2. Fix DataHandler / data-context timing so hooks + children work under Strict Mode.
3. Run and document the package against React 19 (devDeps + CI matrix optional).
4. Update package/docs copy that says “geared towards React 16”.
5. Smoke path: either update `patois.web` or a minimal Vite sandbox on React 19.

**Out of scope (unless needed for green tests)**

- Full rewrite of Current API to hooks-only.
- Dropping class components / `prop-types` in v0.x.
- React Native.
- Rewriting the docs site (beyond React version callouts).

---

## Phased plan

### Phase 0 — Baseline & matrix (½ day)

- [ ] Capture current `pnpm nx test @tao.js/react` on React 16 (baseline).
- [ ] Decide support policy for this release:
  - **Recommended:** peer `react` / `react-dom` `^18.2.0 \|\| ^19.0.0` (or `^19.0.0` only if we drop 18).
  - Keep `*` only if we explicitly want “any React” + docs warning.
- [ ] Note dual-React Jest `moduleNameMapper` already in `packages/react-tao/jest.config.js` — preserve while bumping.

**Exit:** Written support decision + baseline test output.

### Phase 1 — Test stack modernization (largest; 1–2 days)

Replace React-16-only tooling:

| Remove / stop using                  | Replace with                       |
| ------------------------------------ | ---------------------------------- |
| `enzyme` + `enzyme-adapter-react-16` | `@testing-library/react` (current) |
| `react-testing-library@5`            | same RTL                           |
| `@testing-library/react-hooks`       | RTL `renderHook`                   |
| `react-test-renderer@16`             | drop or align with React 19        |

Work items:

- [ ] Update root + react-tao jest setup: remove enzyme adapter from `config/setup.js` (or gate it).
- [ ] Port `Reactor.spec.js` (enzyme) → RTL.
- [ ] Port `Provider.spec.js` (legacy RTL) → modern RTL.
- [ ] Port `hooks.spec.js` → `renderHook` from `@testing-library/react`.
- [ ] Leave pure export/helper specs as-is; keep stubs listed for Phase 3.
- [ ] Bump `react` / `react-dom` / `@testing-library/*` in root (and react-tao devDeps) to React 19.

**Exit:** `@tao.js/react` tests green on React 19 (even if some handler specs remain stubs).

### Phase 2 — DataHandler / context timing fix (1–2 days)

Root cause: registration in `componentDidMount` is too late for first render / hooks.

Options (pick one after spike):

1. **Register in constructor / render-phase safe store** (careful with Strict Mode).
2. **Lift registration to Provider** or a synchronous context value update before children render.
3. **Hooks-first data context** with a small internal store subscribed via `useSyncExternalStore` (best long-term for 18/19).

Work items:

- [ ] Spike on Option 3 vs minimal class fix; document choice in this file.
- [ ] Implement fix; add real tests in `DataHandler.spec.js` + `useTaoDataContext` coverage.
- [ ] Verify Strict Mode (double mount) does not double-register handlers incorrectly.

**Exit:** README “FIX DATA CONTEXT” can be checked off; new tests cover mount + hook read.

### Phase 3 — Fill critical Current API tests (1 day)

Stubs today: `RenderHandler`, `SwitchHandler`, `DataHandler`, `withContext`.

- [x] Minimal happy-path + cleanup tests for each (RTL).
- [x] One Strict Mode smoke for Provider + hook handler registration (`DataHandler.spec.js`).

**Exit:** Regressions on 19 are detectable for the public Current API.

### Phase 4 — Peers, packaging, docs (½ day)

- [ ] Set peer ranges per Phase 0 decision.
- [ ] Update `packages/react-tao/README.md` + docs snippets (React 16 → 18/19).
- [ ] AGENTS.md note: React version support for `@tao.js/react`.
- [ ] Optional: deprecate or document `orig` Adapter/Reactor as legacy.

### Phase 5 — Consumer smoke (½–1 day)

Prefer a **minimal Vite + React 19** sandbox under `examples/` (or update patois later):

- [x] Provider + DataHandler + hook + RenderHandler render smoke (`examples/react19-smoke`).
- [x] Confirm no peer warnings on install (example uses React 19; `patois.web` still warns on 16).

`patois.web` (CRA 2) can stay on React 16 until a separate “revive example” task, or get a follow-up upgrade.

### Phase 6 — Release

- [ ] `pnpm test` / `pnpm build` monorepo green.
- [ ] Alpha: `0.17.0-alpha.react19` (or patch if API-compatible) on `alpha` tag.
- [ ] Stable release after smoke (coordinate with fixed-version Nx Release — **all** public packages bump together).

---

## Risk register

| Risk                                   | Level           | Mitigation                                 |
| -------------------------------------- | --------------- | ------------------------------------------ |
| Enzyme blocks React 19                 | High            | Phase 1 first                              |
| DataHandler timing                     | High            | Phase 2 before calling upgrade “done”      |
| Thin handler test coverage             | Medium          | Phase 3                                    |
| Strict Mode double effects             | Medium          | Explicit cleanup tests                     |
| Fixed-version release couples packages | Medium          | Alpha first; changelog notes React support |
| patois.web stuck on CRA2               | Low for library | Separate example task                      |

---

## Suggested sequencing for agents

1. Phase 1 (tests + React 19 deps) — unblocks everything.
2. Phase 2 (DataHandler) — product correctness.
3. Phases 3–5 — confidence + docs + smoke.
4. Phase 6 — publish.

Do **not** publish a “React 19 support” release until Phases 1–2 are done.

---

## Open decisions (resolve in Phase 0)

1. Support **18 + 19**, or **19 only**?
2. Keep `prop-types` peer required, or optional / drop in a later major?
3. Invest in `patois.web` now vs new Vite example?
4. Is `orig` Adapter/Reactor still supported on 19, or legacy-docs-only?

Default recommendations: **18+19 peers**, keep `prop-types` for now, **new Vite example**, document `orig` as legacy.
