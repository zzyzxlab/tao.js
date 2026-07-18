# Mutation testing (`@tao.js/react`)

StrykerJS + Jest for the React adapter package.

## Run

From repo root:

```sh
pnpm test:mutation:react
```

Or from this package:

```sh
pnpm test:mutation
```

HTML/JSON reports land in `reports/mutation/` (gitignored).

## Notes

- Config: `stryker.config.json` — `inPlace: true` so Jest can resolve the monorepo `jest.preset.cjs` and shared React `moduleNameMapper`.
- `testEnvironment` is set explicitly on the package Jest config **and** as Stryker’s jsdom env wrapper — Stryker does not merge preset-provided `testEnvironment` under `perTest` coverage analysis.
- Barrel re-exports (`index.js`, `all.js`, `orig.js`) are excluded from mutation (same as coverage).
- Disable equivalent mutants with `// Stryker disable … : reason` (colon required; place `disable` before a `try`, not inside it).
- Latest score (2026-07-18): **100%** (270 killed, 11 timeout, 0 survived; thresholds high=95).
- Optional `debug` console paths and redundant Provider-`{}` null checks are Stryker-disabled as equivalent.

See `@tao.js/core` (`packages/tao/README.mutation.md`) for the pattern used to raise scores.
