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

| npm name              | Directory                  | Purpose                                                                                                                                                  |
| --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tao.js/core`        | `packages/tao`             | Kernel, Network, AppCtx, default `TAO`, handler constants                                                                                                |
| `@tao.js/utils`       | `packages/tao-utils`       | Signal-network building blocks: `Channel`, `Source`, `Transponder`, `Transceiver`, `trigramFilter`, `seive`, bridges / transfer / forward-chain / logger |
| `@tao.js/react`       | `packages/react-tao`       | React adapter: `Provider`, handlers (`DataHandler`, `RenderHandler`, `SwitchHandler`, …), hooks (`useTaoContext`, `useTaoInlineHandler`, …)              |
| `@tao.js/router`      | `packages/tao-router`      | URL routing ↔ AppCons (`route`, default `init`)                                                                                                         |
| `@tao.js/socket.io`   | `packages/tao-socket-io`   | Wire a Kernel to socket.io (`wireTaoJsToSocketIO`)                                                                                                       |
| `@tao.js/koa`         | `packages/koa-tao`         | Expose a TAO network over HTTP via Koa middleware                                                                                                        |
| `@tao.js/http-client` | `packages/tao-http-client` | HTTP client for a TAO HTTP server (`TaoHttpClient`) — private                                                                                            |
| `@tao.js/connect`     | `packages/tao-connect`     | Connect/Express middleware — **private / incomplete**                                                                                                    |
| `@tao.js/feature`     | `packages/tao-feature`     | Dynamic feature loading — **private / incomplete**                                                                                                       |
| `@tao.js/path`        | `packages/tao-path`        | Config-driven value paths — **private / incomplete**                                                                                                     |
| `docs`                | `packages/docs`            | GitBook-style docs site sources                                                                                                                          |
| examples              | `examples/*`               | e.g. `patois.api`, `patois.web`                                                                                                                          |

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

### Editing guidance

- Match existing style (plain JS classes in core; Jest + mocks in tests).
- Do not rewrite the docs site (`packages/docs`) unless asked.
- Keep this file accurate: if you change a public API, update the relevant section here.

### Knowledge handoff

Append durable findings to **Agent notes** below (API quirks, migration status, “don’t do X”). Prefer short dated bullets over essays.

---

## 6. Agent notes

_Append learnings for the next agent. Newest first._

- **2026-07-16** — Renamed this file from `TAO.md` → `AGENTS.md`. Reserve `TAO.md` for app repos that document their message protocol; see `FUTURE.md`.
- **2026-07-16** — `@tao.js/core` default export is a shared `Kernel` instance named `TAO`. `Network` is lower-level; app code and most adapters should use `Kernel` / `TAO`. Wildcard AppCons are ignored on `setCtx`/`setAppCtx` unless `new Kernel(true)`.
- **2026-07-16** — `Kernel.channel(...)` exists but looks unfinished vs `@tao.js/utils` `Channel` (prefer utils `Channel` for real channeling).
- **2026-07-16** — Monorepo mid-migration from Lerna → Nx (`FUTURE.md`); several packages (`connect`, `feature`, `path`) are private stubs.
- **2026-07-16** — See `FUTURE.md` for roadmap (TS wrapper, React 19, docs rewrite, ownership transfer, etc.).
