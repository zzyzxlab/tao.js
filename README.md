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
* [ ] complete `tao` package
  * [x] refactor the `tao` API for consistency - e.g. replace external references to `term` => `t`, `action` => `a`, `orient` => `o`
  * [x] write unit tests
    * [x] adding inline handler unit tests
    * [x] adding async handler unit tests
    * [x] adding intercept handler unit tests
    * [x] removing inline handler unit tests
    * [x] removing async handler unit tests
    * [x] removing intercept handler unit tests
    * [x] using `asPromiseHook`
  * [ ] create non-asynchronous version of `setCtx` and `setAppCtx` as originally intended
* [ ] complete `react-tao` package
  * [x] port `Provider`
  * [x] port `Reactor`
  * [x] unit tests for `Provider`
  * [ ] unit tests for `Reactor`
  * [ ] enable `Provider` to unset current component using `null` as a handler for TAO ACs
  * [ ] `Reactor`+`Provider` combo implements `shouldComponentUpdate`
  * [ ] `Reactor` support multiple children?
* [ ] complete `koa-tao` package
* [ ] write phase 1 of `docs`
* [ ] complete `tao-connect` package
  * [ ] update `docs` with `tao-connect`
* [ ] complete `tao-socket-io` package
  * [ ] update `docs` with `tao-socket-io`
* [ ] complete `tao-path` package
  * [ ] update `docs` with `tao-path`
* [ ] complete `tao-mesh` package
  * [ ] update `docs` with `tao-mesh`
* [ ] complete `tao-feature` package
  * [ ] update `docs` with `tao-feature`
* [ ] complete `tao-cli` package
  * [ ] update `docs` with `tao-cli`
