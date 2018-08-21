# tao.js

`tao` represents a new _way_ of programming

## Further Reading

[Docs at zzyzxlab.github.io/tao.js/](https://zzyzxlab.github.io/tao.js/)

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
  - [x] port `Provider`
  - [x] port `Reactor`
  - [x] unit tests for `Provider`
  - [x] unit tests for `Reactor`
  - [x] enable `Provider` to unset current component using `null` as a handler for TAO ACs
  - [x] refactor `Provider` to be `Adapter`
  - [x] make taople definition on `Adapter.addComponentHandler` #2 method consistent with `@tao.js/core`
- [ ] complete `@tao.js/socket-io` package
  - [x] figure out how to ensure responses go to same requestor
  - [x] implement using new `Kernel` / socket
  - [ ] unit tests
  - [x] integrate into `patois` example app
  - [ ] handle file uploads
- [x] write phase 1 of `docs`
- [ ] complete `@tao.js/router` package
  - [ ] update location from AppCons
  - [ ] initialize route config
  - [ ] dynamically add routes
  - [ ] dynamically remove routes
  - [ ] get AppCon from incoming route
  - [ ] integrate into `patois` example app
  - [ ] update `docs` with `@tao.js/router`
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
