# [0.15.0](https://github.com/zzyzxlab/tao.js/compare/v0.14.3...v0.15.0) (2023-01-31)

### Features

- **socket.io-client:** allow passing options to socket on client ([ea0b59c](https://github.com/zzyzxlab/tao.js/commit/ea0b59cc300915a7340447ecab58f970bab7809d))

## [0.14.3](https://github.com/zzyzxlab/tao.js/compare/v0.14.2...v0.14.3) (2022-07-30)

### Bug Fixes

- **Transceiver:** added missing AppCtx import ([d10c4ef](https://github.com/zzyzxlab/tao.js/commit/d10c4ef0a8199c8476619d846bd7dd56e4f74355))

## [0.14.2](https://github.com/zzyzxlab/tao.js/compare/v0.14.1...v0.14.2) (2022-02-07)

### Bug Fixes

- **DataConsumer:** port RenderHandler data context fix to DataConsumer ([2af1a4f](https://github.com/zzyzxlab/tao.js/commit/2af1a4fb3d0cab04289f8bd49e0fc68301f64211))
- **RenderHandler:** updates to context data post-render pushed updated data as subsequent args ([c5556ed](https://github.com/zzyzxlab/tao.js/commit/c5556edece18cb1ae56f8758f8c5903e69b4cc2b))

## [0.14.1](https://github.com/zzyzxlab/tao.js/compare/v0.14.0...v0.14.1) (2022-02-05)

### Bug Fixes

- **SwitchHandler:** fixes losing child references on rerender after DataHandler change ([2f13ec1](https://github.com/zzyzxlab/tao.js/commit/2f13ec1e024ce43d1b2a1086dadf417184d9cafd))

# [0.14.0](https://github.com/zzyzxlab/tao.js/compare/v0.13.2...v0.14.0) (2021-04-05)

- **react:** refactor `componentWillMount` -> `componentDidMount` + `componentWillReceiveProps` -> `componentDid`

`componentWillMount` and `componentWillReceiveProps` were deprecated in React 16.3.0 and will be removed in 17

## [0.13.2](https://github.com/zzyzxlab/tao.js/compare/v0.13.1...v0.13.2) (2021-04-01)

### Bug Fixes

- **hooks:** fixed bad this ref in hook implementation for permutations ([f3aa058](https://github.com/zzyzxlab/tao.js/commit/f3aa058))

## [0.13.1](https://github.com/zzyzxlab/tao.js/compare/v0.13.0...v0.13.1) (2021-03-31)

### Bug Fixes

- **hooks:** missing import in [@tao](https://github.com/tao).js/react:hooks ([c79a976](https://github.com/zzyzxlab/tao.js/commit/c79a976))

# [0.13.0](https://github.com/zzyzxlab/tao.js/compare/v0.12.1...v0.13.0) (2021-03-17)

### Features

- **hooks:** added useTaoContext hook to get the TAO network ([d97db2a](https://github.com/zzyzxlab/tao.js/commit/d97db2a))

### Other

- **debug:** refactored to push console.log of internals to a debug flag

## [0.12.1](https://github.com/zzyzxlab/tao.js/compare/v0.12.0...v0.12.1) (2021-03-03)

### Bug Fixes

- **deps:** fixed peer deps across [@tao](https://github.com/tao).js packages ([dd498b9](https://github.com/zzyzxlab/tao.js/commit/dd498b9))
- **source:** bug in utils.Source preventing chained ACs from the source ([09659f9](https://github.com/zzyzxlab/tao.js/commit/09659f9)), closes [#29](https://github.com/zzyzxlab/tao.js/issues/29)

# [0.12.0](https://github.com/zzyzxlab/tao.js/compare/v0.11.1...v0.12.0) (2021-02-24)

### Features

- **koa:** simpleMiddleWare for koa ([92674d9](https://github.com/zzyzxlab/tao.js/commit/92674d9)), closes [#23](https://github.com/zzyzxlab/tao.js/issues/23)
- **react-hooks:** implemented hooks for react 16.8+ to use with tao.js ([f505060](https://github.com/zzyzxlab/tao.js/commit/f505060)), closes [#26](https://github.com/zzyzxlab/tao.js/issues/26)
- **Transceiver:** transceiver provides more control over promise conversion of signals ([f6e5959](https://github.com/zzyzxlab/tao.js/commit/f6e5959)), closes [#22](https://github.com/zzyzxlab/tao.js/issues/22) [#24](https://github.com/zzyzxlab/tao.js/issues/24)

## [0.11.1](https://github.com/zzyzxlab/tao.js/compare/v0.11.0...v0.11.1) (2020-06-28)

### Bug Fixes

- **koa:** add new index.js to import tao-http-middleware.js ([8ef8cbd](https://github.com/zzyzxlab/tao.js/commit/8ef8cbd))
- **koa:** fixed koa middleware to use Channel + Transponder ([84a0cba](https://github.com/zzyzxlab/tao.js/commit/84a0cba))

# [0.11.0](https://github.com/zzyzxlab/tao.js/compare/v0.9.0...v0.11.0) (2020-06-27)

### Bug Fixes

- **fluent:** channel & Transponder in utils was not returning `this` for fluent chaining of handlers l ([df35d6b](https://github.com/zzyzxlab/tao.js/commit/df35d6b))
- **Network:** prevent same middleware from being added multiple times ([d06913f](https://github.com/zzyzxlab/tao.js/commit/d06913f))

### Features

- **Channel:** id and cloneId params can now take a function used to generate channel ID ([72fb205](https://github.com/zzyzxlab/tao.js/commit/72fb205))
- **Channel:** implements elements of Network interface ([68164a5](https://github.com/zzyzxlab/tao.js/commit/68164a5))
- **Transponder:** transponder is now composable to other Network implementations to attach promise ([ebc2e62](https://github.com/zzyzxlab/tao.js/commit/ebc2e62)), closes [#21](https://github.com/zzyzxlab/tao.js/issues/21)

### BREAKING CHANGES

- **Transponder:** Transponder no longer implements Kernel interface of add/remove handlers||To get the pre-existing
  behavior create a Channel and pass that to the Transponder constructor

# [0.9.0](https://github.com/zzyzxlab/tao.js/compare/v0.8.1...v0.9.0) (2019-08-11)

Big changes as `@tao.js/core`'s `Kernel` was refactored underneath to delegate to
`Network` allowing the additions of `Channel`, `Source` and `Transponder`s in the
new `@tao.js/utils` package to control the flow of signals through the network
using `control` data.

The interface for `Kernel` goes unchanged and the other signal network extensions
from `@tao.js/utils` implement the same interface, so there is no affect on clients.

These signal network extensions (and any subsequent ones) are to be used to implement
signal networks apart from the client code that uses the network, allowing more
effective ways to integrate the signal network(s) with different technologies
behind the scenes like socket.io (improved) and http (via koa for now).

Also introduced in this release is the `@tao.js/koa` package which exposes the
Signal Network using an http endpoint.

### Features

- **koa:** koa integration to provide middleware for signal network as an http interface ([079cdb5](https://github.com/zzyzxlab/tao.js/commit/079cdb5))
- **network:** refactor + creation of Network, Channel and Source ([ad392a0](https://github.com/zzyzxlab/tao.js/commit/ad392a0))
- **RenderHandler:** new refreshOn prop allows trigrams for refreshing the render that won't affect ([0428858](https://github.com/zzyzxlab/tao.js/commit/0428858))
- **seive:** new seive used by Channel allows controlled bridging ([c916870](https://github.com/zzyzxlab/tao.js/commit/c916870))
- **Transponder:** utils adds Transponder for handling promises ([311f738](https://github.com/zzyzxlab/tao.js/commit/311f738))

### BREAKING CHANGES

- **Transponder:** Source's ctor changed the order of the params, making fromSrc optional

### DEPRECATION NOTICE

- **Kernel.asPromiseHook(…)** will be deprecated in favor of **Transponder** from `@tao.js/utils`

# [0.8.1](https://github.com/zzyzxlab/tao.js/compare/v0.7.0...v0.8.1) (2019-06-03)

Using [rollup js](https://rollupjs.org) to build packages now offering 3 different builds:

- ES Modules
- CommonJS
- UMD

_Note: 0.8.0 was published and unpublished to npmjs so is not available_

### Bug Fixes

- **cra:** change patois.web cra from using yarn -> npm ([e81f43b](https://github.com/zzyzxlab/tao.js/commit/e81f43b))
- **dep:** import createBrowserHistory in ESM way ([9cb6d32](https://github.com/zzyzxlab/tao.js/commit/9cb6d32))

### Features

- **package:** rollup build for [@tao](https://github.com/tao).js/react package ([4785f86](https://github.com/zzyzxlab/tao.js/commit/4785f86))
- **package:** rollup build for tao-router complete (CJS + ESM) ([94faa45](https://github.com/zzyzxlab/tao.js/commit/94faa45))
- **package:** rollup build for tao-socket-io (UMD, CJS and ESM) ([6f8e7c2](https://github.com/zzyzxlab/tao.js/commit/6f8e7c2))
- **package:** working 3 diff builds (ESM, CommonJS + UMD) for core package ([76396bf](https://github.com/zzyzxlab/tao.js/commit/76396bf))

<a name="0.7.0"></a>

# [0.7.0](https://github.com/zzyzxlab/tao.js/compare/v0.6.2...v0.7.0) (2019-05-19)

Brand new components for the `@tao.js/react` package to offer a React-like programming experience. See the updated docs for [Using with React.js](https://tao.js.org/client-react/).

New Components are:

- [`Provider`](https://tao.js.org/client-react/provider.html) - provides TAO in context to `Component`s below
- [`RenderHandler`](https://tao.js.org/client-react/render-handler.html) - add TAO handlers declaratively as `Component`s for rendering visual `Component`s into the DOM tree
- [`SwitchHandler`](https://tao.js.org/client-react/switch-handler.html) - add TAO handlers declaratively as `Component`s to determine what to render into the DOM tree
- [`withContext` HOC](https://tao.js.org/client-react/with-context.html) - wrap a `Component` in context to use a TAO handler to retrieve state/data
- [`DataHandler`](https://tao.js.org/client-react/data-handler.html) - add TAO handlers declaratively as `Component`s to retrieve shared state/data from AppCons

### Bug Fixes

- **createContextHandler:** handler precondition check allows passing null/undefined which works w be ([e65c2cf](https://github.com/zzyzxlab/tao.js/commit/e65c2cf))
- **Provider:** ensure [@tao](https://github.com/tao).js/react/Provider's TAO is required and a [@tao](https://github.com/tao).js/core/Kernel ([a8ce457](https://github.com/zzyzxlab/tao.js/commit/a8ce457))
- **RenderHandler:** include prop type for context as string or array of strings ([baa6fba](https://github.com/zzyzxlab/tao.js/commit/baa6fba))

### Features

- **createContextHandler:** passing undefined or null to the handler function will reset the data fo ([78aee3f](https://github.com/zzyzxlab/tao.js/commit/78aee3f))
- **createContextHandler:** updates to createContextHandler for consistent application of documented ([b882630](https://github.com/zzyzxlab/tao.js/commit/b882630))
- **Data/ContextHandler:** react DataHandler (or ContextHandler?) working implementation & with Rend ([7f6c2b8](https://github.com/zzyzxlab/tao.js/commit/7f6c2b8))
- **react:** createContextHandler and withContext HOC + changes to DataHandler ([b3a2827](https://github.com/zzyzxlab/tao.js/commit/b3a2827))
- **RenderHandler:** working version of RenderHandler ([8a0eaee](https://github.com/zzyzxlab/tao.js/commit/8a0eaee))
- **SwitchHandler:** react SwitchHandler component will switch between RenderHandlers that listen on ([12d0d62](https://github.com/zzyzxlab/tao.js/commit/12d0d62))
- **withContext:** tested working withContext HOC for react package ([44c2890](https://github.com/zzyzxlab/tao.js/commit/44c2890))

<a name="0.6.2"></a>

## [0.6.2](https://github.com/zzyzxlab/tao.js/compare/v0.6.1...v0.6.2) (2018-10-22)

### Chore

Needed to publish again to fix a README bug + add related packages to READMEs of all packages

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

- **Adapter:** adapter can receive trigrams as {t,a,o} for consistency with core ([80ebf07](https://github.com/zzyzxlab/tao.js/commit/80ebf07)), closes [#2](https://github.com/zzyzxlab/tao.js/issues/2)
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
