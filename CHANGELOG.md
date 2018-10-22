<a name="0.6.1"></a>

## [0.6.1](https://github.com/zzyzxlab/tao.js/compare/v0.6.0...v0.6.1) (2018-10-22)

### Features

- **Router:** moved Add.attach + Remove.detach from Configure-only support to any Add/Remove context ([f216b37](https://github.com/zzyzxlab/tao.js/commit/f216b37))

<a name="0.6.0"></a>

# [0.6.0](https://github.com/zzyzxlab/tao.js/compare/v0.5.0...v0.6.0) (2018-10-16)

### Bug Fixes

- **AppCtx:** allow falsey values to be set for AppCtx data - testing undefined instead of falsey ([75188dc](https://github.com/zzyzxlab/tao.js/commit/75188dc))

### Features

- **AppCtxRoot:** provide isMatch for library authors to test matching between 2 trigrams ([f2d6b20](https://github.com/zzyzxlab/tao.js/commit/f2d6b20))
- **router:** api update for Router - set ctx to {Route,Set,tao.o} in routeHandler ([cabca5d](https://github.com/zzyzxlab/tao.js/commit/cabca5d))
- **router:** implemented Attach to attach trigrams to routes ([e7fab08](https://github.com/zzyzxlab/tao.js/commit/e7fab08))
- **router:** working route change from set context ([8ecf235](https://github.com/zzyzxlab/tao.js/commit/8ecf235))
- **Router:** working default data for Attach ([353f2f5](https://github.com/zzyzxlab/tao.js/commit/353f2f5))

<a name="0.5.0"></a>

# [0.5.0](https://github.com/zzyzxlab/tao.js/compare/d59cadf...v0.5.0) (2018-08-21)

### Bug Fixes

- **AppCtxHandlers:** change xxxHandlers get props to return Iterators instead of the underlying Sets ([96e16eb](https://github.com/zzyzxlab/tao.js/commit/96e16eb))
- **intercept:** ensures intercept handlers called in sequence like inline handlers, awaiting async m ([17cec15](https://github.com/zzyzxlab/tao.js/commit/17cec15))
- **react-tao:** implemented (un)registerReactor in Provider & signal changes ([9ebdbe8](https://github.com/zzyzxlab/tao.js/commit/9ebdbe8))
- **socket.io:** fixed Kernel / socket to work on separated events ([77ddf6a](https://github.com/zzyzxlab/tao.js/commit/77ddf6a))
- **tao/utils:** fixed utils.concatIterables to work as expected ([28715e0](https://github.com/zzyzxlab/tao.js/commit/28715e0))

### Code Refactoring

- **react:** renamed Provider -> Adapter ([ee7d45d](https://github.com/zzyzxlab/tao.js/commit/ee7d45d))
- **testable:** updated AppCtxHandlers so it doesn't have dependence on De ([123e44c](https://github.com/zzyzxlab/tao.js/commit/123e44c))

### Features

- **Adapter:** adapter can receive taoples as {t,a,o} for consistency with core ([80ebf07](https://github.com/zzyzxlab/tao.js/commit/80ebf07)), closes [#2](https://github.com/zzyzxlab/tao.js/issues/2)
- **api:** modified tao so the api is consistent across adding handlers & setting ctx ([69d287b](https://github.com/zzyzxlab/tao.js/commit/69d287b))
- **AppCtx:** added unwrapCtx method to get bare ctx object ([9ebb558](https://github.com/zzyzxlab/tao.js/commit/9ebb558))
- **AppCtx:** appCtx.unwrapCtx() now has verbose arg to return long name props ([47de443](https://github.com/zzyzxlab/tao.js/commit/47de443))
- **foundation:** ported initial tao base code from prototype ([d59cadf](https://github.com/zzyzxlab/tao.js/commit/d59cadf))
- **Provider:** addComponentHandler can now receive undefined/null Component ([0a1f88a](https://github.com/zzyzxlab/tao.js/commit/0a1f88a))
- **Provider:** implemented and began tests for react/Provider ([448fb2c](https://github.com/zzyzxlab/tao.js/commit/448fb2c))
- **socket.io:** completed TAO Kernal / client - working disconnect callback ([055aa77](https://github.com/zzyzxlab/tao.js/commit/055aa77))

### Tests

- **Reactor:** working propTypes and tests for propTypes ([9df1208](https://github.com/zzyzxlab/tao.js/commit/9df1208))

### BREAKING CHANGES

- **react:** @tao.js/react:Provider is now @tao.js/reach:Adapter|@tao.js/react:Reactor.provider prop is now
  @tao.js/react:Reactor.adapter prop
- **intercept:** previous to this, any intercept handlers that used Promises did not block
- **Reactor:** Reactor requires single provider prop of type Provider
- **Provider:** addComponentHandler no longer throws if ComponentHandler is missing but throws if ComponentHandler
  is not a React.Component or Function
- **tao/utils:** utils.isIterable returns false for Strings
- **testable:** AppCtxHandlers.handleAppCon now requires a 2nd arg passed to set the App Context in a De from
  AppCtx's passed back from handlers
