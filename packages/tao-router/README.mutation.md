# Mutation testing (`@tao.js/router`)

## Run

```sh
pnpm test:mutation:router
```

Reports in `reports/mutation/` (gitignored). Use `// Stryker disable … : reason` for equivalents.

## Notes

- Config: `stryker.config.json` — `inPlace: true`; barrel `index.js` excluded.
- `jest.config.js` sets `testEnvironment: 'jsdom'` explicitly — Stryker's `perTest` coverage analysis does not merge the preset-provided `testEnvironment`.
- Disable equivalent mutants with `// Stryker disable … : reason` (colon required).
- Equivalents disabled as unobservable, given this package's actual call sites:
  - `capitalize`'s `!str || typeof str !== 'string'` guard (`Router.js`) — `str` is always `undefined` or a string captured from a URL path segment, never a truthy non-string, so `!str` alone (or forcing the guard true/false) can't diverge from the full guard.
  - `reactToRoute`'s `debug = false` default parameter (`Router.js`) — every internal caller always passes an explicit boolean, so the default is never evaluated.
  - Detach's `node.defaultData && node.defaultData.has(...)` guard (`Router.js`) — Attach always initializes `defaultData` together with `attached`, so by the time Detach's outer `attached.length` guard is true, `defaultData` is always truthy too.
  - The `if (incoming.length)` guard (`Router.js`) — `[].forEach(...)` is already a no-op, so forcing entry into the block changes nothing observable when `incoming` is empty.
  - `routeHandler.js`'s `needData == null` guard — `path-to-regexp`'s compiled path function throws the identical `Expected "..." to be a string` error whether a param is omitted, `null`, or `undefined`.
  - `routeTag.js`'s `{ default: '' }` lookup option — the final `route.join('')` already converts a missing/`undefined` value to `''`, identical to the explicit default.
- Optional `debug && console.log(...)` logging paths are Stryker-disabled as equivalent (side-effect-only, not part of the observable contract), matching the convention used across this monorepo's other packages.
- Latest score (2026-07-18): **100%** (271 killed, 0 timeout, 0 survived; thresholds high=95, low=90).
