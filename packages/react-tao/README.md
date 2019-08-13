# @tao.js/react

> Adapter to use tao.js with React

See the tao.js website [Usage with React.js](https://tao.js.org/client-react/) for more information
or the [issues](https://github.com/zzyzxlab/tao.js/issues?q=is%3Aissue+is%3Aopen+label%3A"pkg%3A+react")
associated with this package.

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
[![Gitter chat](https://img.shields.io/gitter/room/tao-land/tao.js?style=plastic)](https://gitter.im/tao-land/tao.js)

## Install

Using npm:

```sh
npm install --save @tao.js/react
```

or using yarn:

```sh
yarn add @tao.js/react
```

**NOTE:** [`@tao.js/core`](https://www.npmjs.com/package/@tao.js/core) is a peer dependency

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
import { Provider } from '@tao.js/react';
```

in your file, because webpack is using the UMD bundle, it will import the whole
UMD bundle and make that part of your output.

### Current vs Original API

The `@tao.js/react` package has recently had a complete update to its API (now called the
current API) while keeping its original API. This has been done because consumers of the
package may want to use the simplified original API which has only 2 exports.

The Current API is provides a more React-like developer experience and is geared towards
React 16 using the Context API.

Because of this, `@tao.js/react` builds 3 different versions of bundles for CommonJS and
UMD for the current, original and all (both).

### ES Module

If you are using `import` statements to import `@tao.js/react` then `package.json` identifies
a `module` key to tell Node or your bundler of choice where to find the version packaged as
ES Modules (the `dist` folder).

When using ES Modules, there is no `default` export, so anything imported from `@tao.js/react`
must be a named import, e.g.:

```javascript
import { Provider } from '@tao.js/react';
```

Because ES Modules rely on static import and export statements, they are designed for tree-shaking,
so there is only one bundle built for `@tao.js/react` with the entire API (current and original),
assuming whatever bundler is being used can tree-shake out whatever is not used.

_This is the recommended way to import the package and most modern builders & bundlers can
handle it_

### CommonJS

If you are using `require` statements and not a bundler that understands ES Modules, the
`package.json` identifies the `main` key to tell Node or your bundler where to find the version
packaged as a CommonJS module (the `lib` folder).

When using CommonJS, there is no `default` exports, so anything imported from `@tao.js/react`
must be used by its key, e.g.:

```javascript
const { Provider } = require('@tao.js/react');

// OR
const Provider = require('@tao.js/react').Provider;

// OR
const TaoReact = require('@tao.js/react');
TaoReact.Provider;
```

#### Current API

The importing above refers to importing the [Current API](https://tao.js.org/client-react/) **only**
and will not have any of the original API components/exports available.

#### Original API

In the CommonJS build, because CommonJS is not designed to aid tree-shaking, the [Original API](https://tao.js.org/)[https://tao.js.org/client-react/orig-api/]
is not included in the default package build for CommongJS found in the `lib` folder and pointed to
by `package.json`'s `main` key.

If you want to make use of the [Original API](https://tao.js.org/)[https://tao.js.org/client-react/orig-api/]
then you **must** import from `@tao.js/lib/orig`, e.g.:

```javascript
import { Adapter } from '@tao.js/lib/orig';

// OR
const { Adapter } = require('@tao.js/lib/orig');
```

### UMD Bundles

If you are not using a bundler to build your web application or just want to use a full
bundled version of the package by importing directly into a `<script>` tag then you will
find the bundles in the `bundles` folder (also identified in the `bundles` key in `package.json`).

- `bundles/browser.umd.js` - this is the current API bundled without the original API as global `tao.react`
- `bundles/orig.umd.js` - this is the original API bundled without the current API as global `tao.react.orig`
- `bundles/all.umd.js` - this is both the current & original API bundled together as global `tao.react.all`

```javascript
tao.react.Provider

// OR
<tao.react.Provider TAO={tao.TAO}>
  …
</tao.react.Provider>

// OR
tao.react.orig.Adapter

// OR
tao.react.all.Adapter
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
