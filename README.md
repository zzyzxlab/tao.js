# tao.js

`tao` represents a new _way_ of programming

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
[![Gitter chat](https://img.shields.io/gitter/room/tao-land/tao.js?style=plastic)](https://gitter.im/tao-land/tao.js)

## All Packages in the `@tao.js` family

| package                                                                    | description                                                      | docs page                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`npm @tao.js/core`](https://www.npmjs.com/package/@tao.js/core)           | Core Javascript implementation of the TAO ☯ programming paradigm | [tao.js.org](https://tao.js.org)                                      |
| [`npm @tao.js/utils`](https://www.npmjs.com/package/@tao.js/utils)         | Extensions to Core used to build out the Signal Network          | [tao.js Utilities for Implementers](https://tao.js.org/implementers/) |
| [`npm @tao.js/react`](https://www.npmjs.com/package/@tao.js/react)         | Adapter to use tao.js with React                                 | [Usage with React.js](https://tao.js.org/client-react/)               |
| [`npm @tao.js/socket.io`](https://www.npmjs.com/package/@tao.js/socket.io) | socket.io middleware to run tao.js seamlessly on server & client | [tao.js for Socket.io](https://tao.js.org/server-side/socket-io.html) |
| [`npm @tao.js/koa`](https://www.npmjs.com/package/@tao.js/koa)             | Expose a TAO signal network over http using a koa app server     | [tao.js for Koa](https://tao.js.org/server-side/koa.html)             |
| [`npm @tao.js/router`](https://www.npmjs.com/package/@tao.js/router)       | connects url routing with tao.js                                 | [URL Handling with @tao.js/router](https://tao.js.org/router/)        |

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
  - [ ] use [rollup.js](https://rollupjs.org) for package build?
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

## Publishing

```sh
$ npm run build
$ npm run docs:make
```

update version in `package.jsom`

```sh
$ npm run chore:changelog
$ git commit # ensure changelog updated
$ npm run chore:publish
```

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

Since React changed the lifecycle methods in 16.9 the `setDataContext` is not called before
children mount. This causes an issue with timing as now `setDataContext` is being called by
the `DataHandler` in `componentDidMount` meaning that the children have already mounted.

This causes issues with hooks introduced in 16.13 and using the `useContext` hook within the
`useTaoDataContext` hook as it is receiving the context before it can be set and thus always
returning `undefined` to the component attempting to use the hook.

### Solution

Reimplement the Data Context internals without changing the API to clients.

Build a hierarchy of data using the `name` as a key in the object.

Each successive context passes its parent context data in and sets its own key.

Each `DataHandler`, `RenderHandler` and `DataConsumer` will consume the same `Context`.

This will do the following things:

1. behave more like React expects with the Context API storing data not accessors to data held somewhere else
2. allow the originally desired override and tree of data to match the component tree
3. make the `DataConsumer` component actually work as desired
4. simplify the consumption of context, no more recursive `Context.Consumer`s needed
5. let `DataHandler`s also have a `context` prop to use data from a parent context in their handler
