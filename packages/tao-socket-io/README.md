# @tao.js/socket.io

> socket.io middleware to run tao.js seamlessly on server & client

See the tao.js website [tao.js for Socket.io](https://tao.js.org/server-side/socket-io.html) for
more information or the [issues](https://github.com/zzyzxlab/tao.js/issues?q=is%3Aissue+is%3Aopen+label%3A"pkg%3A+socket.io")
associated with this package.

## Install

Using npm:

```sh
npm install --save @tao.js/socket.io
```

or using yarn:

```sh
yarn add @tao.js/socket.io
```

**NOTE:** [`@tao.js/core`](https://www.npmjs.com/package/@tao.js/core) is a peer dependency

**NOTE:** while [socket.io](https://socket.io) is _**not**_ listed in `package.json` as a
peer dependency because it is never directly imported within `@tao.js/socket.io`, it will
be required to make use of this package

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
import initSocket from '@tao.js/socket.io';
```

in your file, because webpack is using the UMD bundle, it will import the whole
UMD bundle and make that part of your output.

### ES Module

If you are using `import` statements to import `@tao.js/socket.io` then `package.json` identifies
a `module` key to tell Node or your bundler of choice where to find the version packaged as
ES Modules (the `dist` folder).

```javascript
import initSocket from '@tao.js/socket.io';
```

_This is the recommended way to import the package and most modern builders & bundlers can
handle it_

### CommonJS

If you are using `require` statements and not a bundler that understands ES Modules, the
`package.json` identifies the `main` key to tell Node or your bundler where to find the version
packaged as a CommonJS module (the `lib` folder).

```javascript
const initSocket = require('@tao.js/socket.io').default;
```

### UMD Bundles

If you are not using a bundler to build your web application or just want to use a full
bundled version of the package by importing directly into a `<script>` tag then you will
find the bundles in the `bundles` folder (also identified in the `bundles` key in `package.json`).

- `bundles/browser.umd.js` - available as global `tao.socketIO`

```javascript
tao.socketIO(tao.TAO, window.io, {
  host: 'localhost:8080'
});
```

In the future, this will be published to a CDN for convenience.

## Related Packages in the `@tao.js` family

| package                                                              | description                                                      | docs page                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| [`npm @tao.js/core`](https://www.npmjs.com/package/@tao.js/core)     | Core Javascript implementation of the TAO ☯ programming paradigm | [tao.js.org](https://tao.js.org)                               |
| [`npm @tao.js/react`](https://www.npmjs.com/package/@tao.js/react)   | Adapter to use tao.js with React                                 | [Usage with React.js](https://tao.js.org/client-react/)        |
| [`npm @tao.js/router`](https://www.npmjs.com/package/@tao.js/router) | connects url routing with tao.js                                 | [URL Handling with @tao.js/router](https://tao.js.org/router/) |
