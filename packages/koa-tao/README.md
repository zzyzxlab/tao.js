# @tao.js/koa

> middleware used to expose a TAO signal network over http using a koa app server

See the website [tao.js](tao.js.org) for more information or the [issues](https://github.com/zzyzxlab/tao.js/issues?q=is%3Aissue+is%3Aopen+label%3A"pkg%3A+koa")
associated with this package.

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
[![Gitter chat](https://img.shields.io/gitter/room/tao-land/tao.js?style=plastic)](https://gitter.im/tao-land/tao.js)

## Install

Using npm:

```sh
npm install --save @tao.js/koa
```

or using yarn:

```sh
yarn add @tao.js/koa
```

## Importing

The package provides 3 different ways to import based upon how it's being used.

All `@tao.js` packages use the following pattern to provide keys in `package.json`
telling Node and bundlers where to find the packages distributed code:

- `module` - provides a ES Module version of the package (in the `dist` folder)
- `main` - provides a CommonJS version of the package (in the `lib` folder)

### ES Module

If you are using `import` statements to import `@tao.js/koa` then `package.json` identifies
a `module` key to tell Node or your bundler of choice where to find the version packaged as
ES Modules (the `dist` folder).

```javascript
import taoKoa from '@tao.js/koa';
```

_This is the recommended way to import the package and most modern builders & bundlers can
handle it_

### CommonJS

If you are using `require` statements and not a bundler that understands ES Modules, the
`package.json` identifies the `main` key to tell Node or your bundler where to find the version
packaged as a CommonJS module (the `lib` folder).

```javascript
const taoKoa = require('@tao.js/koa').default;
```

### UMD Bundles

Since `@tao.js/koa` is only used server-side in node.js, there are no UMD bundles provided
for this package.

## All Packages in the `@tao.js` family

| package                                                                    | description                                                      | docs page                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`npm @tao.js/core`](https://www.npmjs.com/package/@tao.js/core)           | Core Javascript implementation of the TAO ☯ programming paradigm | [tao.js.org](https://tao.js.org)                                      |
| [`npm @tao.js/utils`](https://www.npmjs.com/package/@tao.js/utils)         | Extensions to Core used to build out the Signal Network          | [tao.js Utilities for Implementers](https://tao.js.org/implementers/) |
| [`npm @tao.js/react`](https://www.npmjs.com/package/@tao.js/react)         | Adapter to use tao.js with React                                 | [Usage with React.js](https://tao.js.org/client-react/)               |
| [`npm @tao.js/socket.io`](https://www.npmjs.com/package/@tao.js/socket.io) | socket.io middleware to run tao.js seamlessly on server & client | [tao.js for Socket.io](https://tao.js.org/server-side/socket-io.html) |
| [`npm @tao.js/koa`](https://www.npmjs.com/package/@tao.js/koa)             | Expose a TAO signal network over http using a koa app server     | [tao.js for Koa](https://tao.js.org/server-side/koa.html)             |
| [`npm @tao.js/router`](https://www.npmjs.com/package/@tao.js/router)       | connects url routing with tao.js                                 | [URL Handling with @tao.js/router](https://tao.js.org/router/)        |
