# react19-smoke

Minimal **Vite + React 19** sandbox for `@tao.js/react`.

Exercises:

- `Provider` + isolated `Kernel`
- `DataHandler` + `useTaoDataContext` (data available on first render / Strict Mode)
- `SwitchHandler` + `RenderHandler`
- `useTaoContext` to signal AppCons from buttons

## Run

From the monorepo root (after `pnpm install`), build the library packages first, then start Vite:

```sh
pnpm nx run-many -t build -p @tao.js/core,@tao.js/react
pnpm --filter react19-smoke dev
```

Open http://localhost:5199 — you should see `session: smoke-ok` immediately, then View/Edit panels when you click the buttons.

```sh
pnpm --filter react19-smoke build
```
