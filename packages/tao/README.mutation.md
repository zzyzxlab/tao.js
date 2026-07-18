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
- Latest score (2026-07-18): **90.31%** mutation score (377 killed, 154 timeout, 57 survived; thresholds high=90).
- Equivalent noop-`console` catch/log paths in `AppCtxHandlers` are Stryker-disabled.

Next: keep killing behavioral survivors in `AppCtx` / `Network`, then roll Stryker out to other packages.
