# @tao.js/core

> Core Javascript implementation of the TAO ☯ programming paradigm designed to embrace entropy
> inherent in application and system development using a simple set of building blocks

See the website [tao.js](https://tao.js.org) for more information or the [issues](https://github.com/zzyzxlab/tao.js/issues?q=is%3Aissue+is%3Aopen+label%3A"pkg%3A+core")
associated with this package.

## Install

Using npm:

```sh
npm install --save @tao.js/core
```

or using yarn:

```sh
yarn add @tao.js/core
```

## Importing

The package provides 3 different ways to import based upon how it's being used.

All `@tao.js` packages use the following pattern to provide keys in `package.json`
telling Node and bundlers where to find the packages distributed code:

- `module` - provides a ES Module version of the package (in the `dist` folder)
- `main` - provides a CommonJS version of the package (in the `lib` folder)
- `bundles` - provides keys for any UMD bundles of the package (in the `bundles` folder)
  - _currently there is no bundler using this pattern but now you know where to find it_

### Why NO `browser` key in `package.json`

The current pattern for packaging bundles meant for browser import is to provide a
`browser` key in `package.json`. This _should_ be the way to go but unfortunately
doing this doesn't provide control to you in certain situations.

For instance, in Webpack 4, which is used by `create-react-app`, the default configuration
is to prefer the `browser` bundle when packaging a build intended for a browser. Unless
you are controlling this configuration in your `create-react-app` (and most don't) then
the build process will use the UMD bundle and not be able to leverage tree-shaking if
you only import and use parts of the package library.

In this circumstance, even if you do what you think is correct and:

```javascript
import { Kernel } from '@tao.js/core';
```

in your file, because webpack is using the UMD bundle, it will import the whole
UMD bundle and make that part of your output.

### ES Module

If you are using `import` statements to import `@tao.js/core` then `package.json` identifies
a `module` key to tell Node or your bundler of choice where to find the version packaged as
ES Modules (the `dist` folder).

```javascript
import TAO, { AppCtx } from '@tao.js/core';
```

_This is the recommended way to import the package and most modern builders & bundlers can
handle it_

### CommonJS

If you are using `require` statements and not a bundler that understands ES Modules, the
`package.json` identifies the `main` key to tell Node or your bundler where to find the version
packaged as a CommonJS module (the `lib` folder).

```javascript
const TAO = require('@tao.js/core').default;

// OR
const Kernel = require('@tao.js/core').Kernel;

// OR
const tao = require('@tao.js/core');
tao.Kernel;
```

### UMD Bundles

If you are not using a bundler to build your web application or just want to use a full
bundled version of the package by importing directly into a `<script>` tag then you will
find the bundles in the `bundles` folder (also identified in the `bundles` key in `package.json`).

- `bundles/browser.umd.js` - available as global `tao`

```javascript
tao.TAO;

// OR
const kernel = new tao.Kernel();

const ac = new tao.AppCtx('x', 'y', 'z');
```

In the future, this will be published to a CDN for convenience.

## All Packages in the `@tao.js` family

| package                                                                    | description                                                      | docs page                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`npm @tao.js/core`](https://www.npmjs.com/package/@tao.js/core)           | Core Javascript implementation of the TAO ☯ programming paradigm | [tao.js.org](https://tao.js.org)                                      |
| [`npm @tao.js/utils`](https://www.npmjs.com/package/@tao.js/utils)         | Extensions to Core used to build out the Signal Network          | [tao.js Utilities for Implementers](https://tao.js.org/implementers/) |
| [`npm @tao.js/react`](https://www.npmjs.com/package/@tao.js/react)         | Adapter to use tao.js with React                                 | [Usage with React.js](https://tao.js.org/client-react/)               |
| [`npm @tao.js/socket.io`](https://www.npmjs.com/package/@tao.js/socket.io) | socket.io middleware to run tao.js seamlessly on server & client | [tao.js for Socket.io](https://tao.js.org/server-side/socket-io.html) |
| [`npm @tao.js/koa`](https://www.npmjs.com/package/@tao.js/koa)             | Expose a TAO signal network over http using a koa app server     | [tao.js for Koa](https://tao.js.org/server-side/koa.html)             |
| [`npm @tao.js/router`](https://www.npmjs.com/package/@tao.js/router)       | connects url routing with tao.js                                 | [URL Handling with @tao.js/router](https://tao.js.org/router/)        |
