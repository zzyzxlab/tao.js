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
- Baseline score (2026-07-18): **~88%** mutation score (372 killed, 181 timeout, 74 survived).

Next: raise thresholds / kill survivors with stronger tests, then roll Stryker out to other packages.
