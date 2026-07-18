# Mutation testing (`@tao.js/socket.io`)

StrykerJS + Jest for the socket.io bridge package.

## Run

From repo root:

```sh
pnpm test:mutation:socket.io
```

Or from this package:

```sh
pnpm test:mutation
```

HTML/JSON reports land in `reports/mutation/` (gitignored).

## Notes

- Config: `stryker.config.json` — `inPlace: true`; Jest env is Node (client vs server is simulated via `window` in tests + `jest.isolateModules`).
- Disable equivalent mutants with `// Stryker disable … : reason` (colon required).
- Latest score (2026-07-18): **100%**.
