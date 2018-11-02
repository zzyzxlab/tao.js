# tao.js

`tao` represents a new _way_ of programming

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

## Related Packages in the `@tao.js` family

| package                                                                    | description                                                      | docs page                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`npm @tao.js/core`](https://www.npmjs.com/package/@tao.js/core)           | Core Javascript implementation of the TAO ☯ programming paradigm | [tao.js.org](https://tao.js.org)                                      |
| [`npm @tao.js/react`](https://www.npmjs.com/package/@tao.js/react)         | Adapter to use tao.js with React                                 | [Usage with React.js](https://tao.js.org/client-react/)               |
| [`npm @tao.js/socket.io`](https://www.npmjs.com/package/@tao.js/socket.io) | socket.io middleware to run tao.js seamlessly on server & client | [tao.js for Socket.io](https://tao.js.org/server-side/socket-io.html) |
| [`npm @tao.js/router`](https://www.npmjs.com/package/@tao.js/router)       | connects url routing with tao.js                                 | [URL Handling wtih @tao.js/router](https://tao.js.org/router/)        |

## Further Reading

Docs at [tao.js.org](https://tao.js.org)

## Unicode Characters

| char | code   | symbol    |
| ---- | ------ | --------- |
| ☯    | U+262F | yin-yang  |
| ☰    | U+2630 | heaven    |
| ☱    | U+2631 | lake      |
| ☲    | U+2632 | fire      |
| ☳    | U+2633 | thunder   |
| ☴    | U+2634 | wind/wood |
| ☵    | U+2635 | water     |
| ☶    | U+2636 | mountain  |
| ☷    | U+2637 | earth     |

## More to come

This really needs to be filled out

## Getting started with this repo

The repo is designed to use `nvm` and `npm`/`npx` so that nothing is expected to be installed globally.
Additionally, to run the examples you should have Docker installed locally as well.

In the root of the repo:

```sh
$ nvm install
$ npm install
$ npx lerna bootstrap --hoist
```

### Running example site and api

The Example work are the folders inside the [`examples`] directory. To run them:

```sh
# in repo root dir
$ docker-compose up -d
# once db is running
$ cd examples/patois.api
$ npm start
$ cd ../patois.web
$ yarn start
```

## Contributing - REALLY IMPORTANT INSTRUCTIONS

This project uses `commitizen` and `lerna` + some githooks for `prettier` and `jest` to run.

When you have made some changes and staged them **do not** use `git commit` but instead use:

```sh
$ npx git cz
```

Which will start `commitizen` for you to generate the commit message in the desired conventional changelog format.

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
  - [x] make taople definition on `Adapter.addComponentHandler` #2 method consistent with `@tao.js/core`
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
  - [ ] docs for `Provider`
  - [ ] docs for `createContextHandler`
  - [ ] docs for `DataHandler`
  - [ ] docs for `withContext`
  - [ ] docs for `RenderHandler`
  - [ ] docs for `SwitchHandler`
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
- [ ] complete `@tao.js/react-router` package
  - [ ] implement `Link` component to set context
  - [ ] update `docs` with `@tao.js/react-router` routing
- [ ] complete `@tao.js/koa` package
  - [ ] finish middleware design
  - [ ] figure out how to ensure responses go to same requestor
  - [ ] unit tests
  - [ ] update `docs` with `@tao.js/koa`
- [ ] complete `@tao.js/connect` package
  - [ ] update `docs` with `@tao.js/connect`
- [ ] complete `@tao.js/path` package
  - [ ] update `docs` with `@tao.js/path`
- [ ] complete `@tao.js/mesh` package
  - [ ] update `docs` with `@tao.js/mesh`
- [ ] complete `@tao.js/feature` package
  - [ ] update `docs` with `@tao.js/feature`
- [ ] complete `@tao.js/cli` package
  - [ ] update `docs` with `@tao.js/cli`
