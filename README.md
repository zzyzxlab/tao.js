# tao.js

`tao` represents a new _way_ of programming

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![nx](https://img.shields.io/badge/maintained%20with-nx-cc00ff.svg)](https://nx.dev/)
[![Gitter chat](https://img.shields.io/gitter/room/tao-land/tao.js?style=plastic)](https://gitter.im/tao-land/tao.js)

## All Packages in the `@tao.js` family

| package                                                                    | description                                                       | docs page                                                             |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`npm @tao.js/core`](https://www.npmjs.com/package/@tao.js/core)           | Core Javascript implementation of the TAO ☯ programming paradigm | [tao.js.org](https://tao.js.org)                                      |
| [`npm @tao.js/utils`](https://www.npmjs.com/package/@tao.js/utils)         | Extensions to Core used to build out the Signal Network           | [tao.js Utilities for Implementers](https://tao.js.org/implementers/) |
| [`npm @tao.js/react`](https://www.npmjs.com/package/@tao.js/react)         | Adapter to use tao.js with React                                  | [Usage with React.js](https://tao.js.org/client-react/)               |
| [`npm @tao.js/socket.io`](https://www.npmjs.com/package/@tao.js/socket.io) | socket.io middleware to run tao.js seamlessly on server & client  | [tao.js for Socket.io](https://tao.js.org/server-side/socket-io.html) |
| [`npm @tao.js/koa`](https://www.npmjs.com/package/@tao.js/koa)             | Expose a TAO signal network over http using a koa app server      | [tao.js for Koa](https://tao.js.org/server-side/koa.html)             |
| [`npm @tao.js/router`](https://www.npmjs.com/package/@tao.js/router)       | connects url routing with tao.js                                  | [URL Handling with @tao.js/router](https://tao.js.org/router/)        |

## Further Reading

Docs at [tao.js.org](https://tao.js.org)

## Unicode Characters

| char | code   | symbol    |
| ---- | ------ | --------- |
| ☯   | U+262F | yin-yang  |
| ☰   | U+2630 | heaven    |
| ☱   | U+2631 | lake      |
| ☲   | U+2632 | fire      |
| ☳   | U+2633 | thunder   |
| ☴   | U+2634 | wind/wood |
| ☵   | U+2635 | water     |
| ☶   | U+2636 | mountain  |
| ☷   | U+2637 | earth     |

## More to come

This really needs to be filled out

## Getting started with this repo

The repo is designed to use `asdf` and `pnpm` so that nothing is expected to be installed globally.
Additionally, to run the examples you should have Docker installed locally as well.

In the root of the repo:

```sh
$ asdf install
$ pnpm install
```

### Running example site and api

The Example work are the folders inside the [`examples`] directory. To run them:

```sh
# in repo root dir
$ docker-compose up -d
# once db is running
$ cd examples/patois.api
$ pnpm start
$ cd ../patois.web
$ pnpm start
```

## Monorepo Management with Nx

This project uses Nx + pnpm workspaces to manage the monorepo.

### Common Commands

```bash
# Install dependencies
pnpm install

# Create a new commit (with conventional commit messages)
pnpm run commit

# Build all packages
pnpm run build

# Build specific package
pnpm exec nx build @tao.js/core

# Run tests
pnpm run test

# Run linting
pnpm run lint

# Run linting on specific package
pnpm exec nx lint @tao.js/core
```

### Package Development

Nx infers projects from `package.json` files under `packages/` and `examples/` — there are no `project.json` files. `@nx/jest/plugin` discovers tests via each package's `jest.config.js` (using the root `jest.preset.cjs`), and `@nx/eslint/plugin` provides lint targets. Root scripts use `nx run-many`.

To add a new package:

1. Create your package directory in `packages/` (covered by pnpm workspaces via `packages/*`)
2. Add a `package.json` with the package name, build scripts (`build`, `build:clean`, `build:package`, etc.), and npm publishing config
3. Add a `jest.config.js` that extends the root preset, e.g. `preset: '../../jest.preset.cjs'`

### Commit Messages

We use commitizen for standardized commit messages. The commit prompt will ask for:

1. Type of change (feat, fix, docs, etc.)
2. Scope (package name)
3. Short description
4. Long description (optional)
5. Breaking changes (optional)

### Useful Nx Commands

```bash
# View dependency graph
pnpm exec nx graph

# Run command only on changed packages
pnpm exec nx affected --target=build

# Run command on specific package
pnpm exec nx build @tao.js/core
pnpm exec nx test @tao.js/core
```

### Project Structure

```
.
├── packages/
│   ├── tao/           # @tao.js/core
│   ├── tao-utils/     # @tao.js/utils
│   ├── react-tao/     # @tao.js/react
│   └── ...
├── nx.json
├── package.json
├── pnpm-workspace.yaml
└── .cz-config.js
```

For more information:

- [Nx Documentation](https://nx.dev)
- [Commitizen](https://github.com/commitizen/cz-cli)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## Contributing - REALLY IMPORTANT INSTRUCTIONS

This project uses a Commitizen-compatible commit message format, plus husky hooks for `prettier` / `jest` (lint-staged) and message validation.

**Humans (interactive):** stage changes, then either:

```sh
$ git commit
```

(opens the wizard when a TTY is available), or:

```sh
$ pnpm run commit
```

**Agents / non-interactive:** use `git commit -m` with the same message shape (must include an `Affected packages:` section). See `AGENTS.md` → Commit messages. The `commit-msg` hook validates; it does not require Cursor.

## To Dos

- [x] bootstrapping
  - [x] add test coverage reporting
- [x] complete `@tao.js/core` package
  - [x] refactor the `tao` API for consistency - e.g. replace external references to `term` => `t`, `action` => `a`, `orient` => `o`
  - [x] write unit tests
    - [x] adding inline handler unit tests
    - [x] adding async handler unit tests
    - [x] adding intercept handler unit tests
    - [x] removing inline handler unit tests
    - [x] removing async handler unit tests
    - [x] removing intercept handler unit tests
    - [x] using `asPromiseHook`
  - [x] refactor intercept handler to `await` like inline handler calls do to match guarantee provided in docs
- [x] complete initial `@tao.js/react` package
  - [x] port `Adapter`
  - [x] port `Reactor`
  - [x] unit tests for `Adapter`
  - [x] unit tests for `Reactor`
  - [x] enable `Adapter` to unset current component using `null` as a handler for TAO ACs
  - [x] make trigram definition on `Adapter.addComponentHandler` #2 method consistent with `@tao.js/core`
- [ ] update to `@tao.js/react`
  - **goal:** provide more idiomatic & declarative React components to use with tao.js (keep the old stuff)
  - [x] implement `Provider` that creates a Context used by the rest of the new React Components - supplies TAO Kernel to Consumers
  - [x] implement `RenderHandler` with child as function to render anything based on triggered handler
  - [x] implement `SwitchHandler` that works like `Reactor` to choose which direct child `RenderHandler`s to display
        based on signaled ACs - turns off/removes `RenderHandler`s like `Adapter` unlike standalone `RenderHandler`
  - [x] implement `DataHandler` that supplies data as a `React.Provider` to `RenderHandler` consumers below
        from data passed into it's `handler`
  - [x] refactor `DataHandler` logic for its context into `createContextHandler` for reuse and expose for public use
  - [x] implement `withContext` HOC
  - [ ] implement dynamic props (aka if props change after mounting) for `Provider`
  - [ ] implement dynamic props (aka if props change after mounting) for `createContextHandler`
  - [ ] implement dynamic props (aka if props change after mounting) for `DataHandler`
  - [ ] implement dynamic props (aka if props change after mounting) for `withContext`
  - [ ] implement dynamic props (aka if props change after mounting) for `RenderHandler`
  - [ ] implement dynamic props (aka if props change after mounting) for `SwitchHandler`
  - [ ] unit tests for `Provider`
  - [ ] unit tests for `createContextHandler`
  - [ ] unit tests for `DataHandler`
  - [ ] unit tests for `withContext`
  - [ ] unit tests for `RenderHandler`
  - [ ] unit tests for `SwitchHandler`
  - [x] docs for `Provider`
  - [x] docs for `createContextHandler`
  - [x] docs for `DataHandler`
  - [x] docs for `withContext`
  - [x] docs for `RenderHandler`
  - [x] docs for `SwitchHandler`
- [ ] complete `@tao.js/socket-io` package
  - [x] figure out how to ensure responses go to same requestor
  - [x] implement using new `Kernel` / socket
  - [ ] unit tests
  - [x] integrate into `patois` example app
  - [ ] handle file uploads
- [x] write phase 1 of `docs`
- [ ] complete `@tao.js/router` package
  - [x] update location from AppCons
  - [x] initialize route config
  - [x] dynamically add routes
  - [x] dynamically remove routes
  - [x] get AppCon from incoming route
  - [x] integrate into `patois` example app
  - [ ] update `docs` with `@tao.js/router`
  - [ ] unit tests
  - [ ] implement query string handling
- [ ] project infrastructure updates from stream npm security issue
  - [x] update deps w lodash deps security warnings from github
  - [x] update `lerna` to v3
  - [x] update `cz-lerna-changelog` for v3 support
  - [ ] include `make` scripts for common chores
  - [ ] upgrade `@babel` packages
  - [ ] migrate to `yarn` for better dependency management?
  - [x] use [rollup.js](https://rollupjs.org) for package build?
- [ ] complete `@tao.js/react-router` package
  - [ ] implement `Link` component to set context
  - [ ] update `docs` with `@tao.js/react-router` routing
- [ ] complete `@tao.js/koa` package
  - [ ] finish middleware design
  - [ ] figure out how to ensure responses go to same requestor
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/koa`
- [ ] complete `@tao/http-client` package
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/http-client`
- [ ] complete `@tao.js/connect` package
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/connect`
- [ ] complete `@tao.js/path` package
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/path`
- [ ] complete `@tao.js/mesh` package
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/mesh`
- [ ] complete `@tao.js/feature` package
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/feature`
- [ ] complete `@tao.js/cli` package
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/cli`
- [ ] complete `@tao.js/rest-maker` package
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/rest-maker`

## Publishing

Public packages (`@tao.js/core`, `@tao.js/utils`, `@tao.js/react`, `@tao.js/router`, `@tao.js/socket.io`, `@tao.js/koa`) are released **together at the same version** (same as the old Lerna fixed-version flow) via [Nx Release](https://nx.dev/features/manage-releases). That keeps peer dependency management simple for consumers. Private packages are excluded.

```sh
# Build artifacts into each package's dist/lib/bundles
pnpm run build

# Preview (no git/npm writes). Pass a semver bump or exact version:
pnpm exec nx release patch --dry-run --first-release --skip-publish
# or sync everyone to one version explicitly:
# pnpm exec nx release 0.16.3 --dry-run --first-release --skip-publish

# Create the shared version, update root CHANGELOG.md, git commit + tag
# (prompts to publish; use --skip-publish to only version)
pnpm exec nx release patch --first-release --skip-publish

# Publish already-versioned packages
pnpm run release:publish
```

After the first release (once a `v{version}` tag exists), drop `--first-release`. Tags look like `v0.16.3`. You need npm auth (`npm login` / `NPM_TOKEN`) to publish.

Package versions on disk currently drift slightly (leftover from pre-Nx). The first fixed release should use an **exact version** (e.g. `0.16.3`) so all public packages converge.

**Caveats (Nx 21.3):**

- Pass an explicit bump (`patch` / `minor` / `major` / exact version). Do not rely on conventional-commit auto-bump yet — full history would incorrectly force majors.
- `"*"` peerDependencies are preserved via `tools/release/version-actions.cjs` (Nx 21.3 does not yet ship `preserveMatchingDependencyRanges`).

## real world

Finding trigrams in code

- search w/ regex `{term}.*{action}.*{orient}`
- build VS Code extension to find and navigate to them: signalling and handling

Refactoring data passing from one part to another

Forwarding with passing all data parts

Auth Handling

Stop bouncing ALL trigrams with socket.io - use seive or filtering

Verify that Intercept Handlers prevent signals from going to the server via socket.io

Logging support and shipping all ACs somewhere

Capturing TRACE_IDs and SPANs (from inside the network?)

Joiner (for fork-join) will call handler when all provided trigrams have been seen

- used to coordinate out of race conditions
  \*Continuous Joiner - after they've all been seen, it fires again any time one of the trigrams are seen
  with a cache of the previous values from the other ACs

Return array of AppCtx from handler

## FIX DATA CONTEXT FOR REACT

Done on `upgrade-react-19`: named data is nested on the shared Provider `Context` value
(`data[name]`) as each `DataHandler` renders, so `useTaoDataContext` / `DataConsumer` /
`RenderHandler` see values on the first render (including under Strict Mode). See
`REACT-19-UPGRADE.md`.
