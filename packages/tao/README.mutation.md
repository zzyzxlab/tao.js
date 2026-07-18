# Mutation testing (`@tao.js/core`)

StrykerJS + Jest, focused on this package first.

## Run

From repo root:

```sh
pnpm test:mutation:core
```

Or from this package:

```sh
pnpm test:mutation
```

HTML/JSON reports land in `reports/mutation/` (gitignored).

## Notes

- Config: `stryker.config.json` — `inPlace: true` so Jest can still resolve the monorepo `jest.preset.cjs`.
- Unfinished `Kernel.channel` is excluded via `// Stryker disable all`.
- Equivalent / unobservable mutants are commented out with `// Stryker disable … : reason` (noop `console` catches in `AppCtxHandlers`, Set middleware guards, multi-axis leaf index helpers in `Network`, timeout `clearTO` short-circuits in `Kernel`).
- Disable reasons use a colon (`:`), not `--` — otherwise Stryker ignores the directive.
- Latest score (2026-07-18): **99.81%** (371 killed, 141 timeout, 1 survived before final ignore; thresholds high=95).

Next: raise `@tao.js/react` (`pnpm test:mutation:react`), then other public packages.
