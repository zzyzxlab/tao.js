# tao.js

`tao` represents a new _way_ of programming

## Further Reading

[Docs at zyzzyxlab.github.io/tao.js](https://zyzzyxlab.github.io/tao.js)

[What is `tao.js`?](blog post)

## More to come

This really needs to be filled out

## To Dos

* [x] bootstrapping
  * [x] add test coverage reporting
* [x] complete `@tao.js/core` package
  * [x] refactor the `tao` API for consistency - e.g. replace external references to `term` => `t`, `action` => `a`, `orient` => `o`
  * [x] write unit tests
    * [x] adding inline handler unit tests
    * [x] adding async handler unit tests
    * [x] adding intercept handler unit tests
    * [x] removing inline handler unit tests
    * [x] removing async handler unit tests
    * [x] removing intercept handler unit tests
    * [x] using `asPromiseHook`
* [x] complete initial `@tao.js/react` package
  * [x] port `Provider`
  * [x] port `Reactor`
  * [x] unit tests for `Provider`
  * [x] unit tests for `Reactor`
  * [x] enable `Provider` to unset current component using `null` as a handler for TAO ACs
* [ ] complete `@tao.js/socket-io` package
  * [ ] figure out how to ensure responses go to same requestor
  * [ ] unit tests
* [ ] write phase 1 of `docs`
* [ ] complete `@tao.js/koa` package
  * [ ] finish middleware design
  * [ ] figure out how to ensure responses go to same requestor
  * [ ] unit tests
  * [ ] update `docs` with `@tao.js/koa`
* [ ] complete `@tao.js/connect` package
  * [ ] update `docs` with `@tao.js/connect`
* [ ] complete `@tao.js/path` package
  * [ ] update `docs` with `@tao.js/path`
* [ ] complete `@tao.js/router` package
  * [ ] update `docs` with `@tao.js/router`
* [ ] complete `@tao.js/react-router` package
  * [ ] implement `Link` component
  * [ ] update `docs` with `@tao.js/react-router` routing
* [ ] complete `@tao.js/mesh` package
  * [ ] update `docs` with `@tao.js/mesh`
* [ ] complete `@tao.js/feature` package
  * [ ] update `docs` with `@tao.js/feature`
* [ ] complete `@tao.js/cli` package
  * [ ] update `docs` with `@tao.js/cli`
