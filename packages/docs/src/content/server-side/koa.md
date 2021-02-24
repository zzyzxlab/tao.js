# tao.js for koa

Use the `@tao.js/koa` package to integrate your [koa][1] `app` with `tao.js` and give it superpowers.

## 3 Types of Middleware

The `@tao.js/koa` package offers 2 ways to integrate `tao.js` with your [koa][1] application
server:

1. Connect your own HTTP API (REST or other) with your application server's TAO Signal Network using either:
  * [Simple Middleware](#simple-middleware) - simple way to add trigrams to determine what triggers a response to a client request
  * [Enhanced Middleware](#enhanced-middleware) - add handlers to respond on trigrams, the handlers provide control over how Promises are handled/concluded
2. [TAO HTTP Middleware](#tao-http-middleware) - use to expose extension of a TAO Signal Network
over HTTP as a single endpoint

## Simple Middleware

If your [koa][1] application server is intended to serve its own REST (or other) API and you
need to bridge the external API to your `TAO` network on the server, use the Simple Middleware
which will give you a clean way to turn your API's HTTP requests into signals into your server's
TAO network without worrying about:

* sending the wrong response to the wrong client
* sending the same response to all clients
* responding on AppCons that should not generate a response to the client

Use the Simple Middleware to attach as a [koa middleware][2] as any other middleware, either at
the root application server  (aka `koa app`) or along any route where you need access to the
primary TAO Signal Network for your server and you need a subset of [TAO Handlers](../basics/handlers.md)
to handle sending a response back to your client.

### Importing Simple Middleware

`@tao.js/socket.io` is designed to be imported on the server the export of a single
default function.  We must also use it to wire up the TAO so that should be imported as well:

```javascript
import TAO from '@tao.js/core':
import { simpleMiddleware } from '@tao.js/koa';
```
OR
```javascript
const TAO = require('@tao.js/core').default;
const simpleMiddleware = require('@tao.js/koa').simpleMiddleware;
```

### Initializing Simple Middleware

`simpleMiddleware` takes 3 options that you can use to control the behavior of the middleware:

|option|type|default|description|
|---|---|---|---|
|`name`|`string`|`undefined`|used to control how the middleware will create names for the underlying TAO Signal Network objects|
|`timeout`|`number`|`3000` (3s)|used dictate how long a request should wait in Milliseconds before the promise is rejected after not receiving a signal that one of the [Response Handlers](#adding-response-handlers) has been called|
|`promise`|`Promise`|built-in `Promise`|a Promise constructor used to integrate with a Promise library to create promises instead of the built-in `Promise` implementation|

```javascript
const middlewareOpts = {
  name: 'my-fun-name',
  timeout: 60000 // 60s
};
const taoMiddleware = simpleMiddleware(TAO, middlewareOpts);
```
OR
```javascript
import * as Promise from "bluebird";
// OR
import {Promise} from "bluebird";
// OR
const Promise = require("bluebird");

…

const middlewareOpts = {
  name: 'my-fun-name',
  timeout: 10000, // 10s
  promise: Promise, // Bluebird's Promise constructor
};
const taoMiddleware = simpleMiddleware(TAO, middlewareOpts);
```

### Add Simple Middleware to `koa app`

Use the `middleware()` function in your instantiated `simpleMiddleware` to attach the middleware
to your `koa app`.

This will add a `ctx.tao` prop that you can use in middleware added after the `simpleMiddleware`
in order to send signals into your `koa app`s TAO Signal Network.

```javascript
app.use(taoMiddleware.middleware());
```

### Adding Response Handlers to Simple Middleware

Response Handlers will provide the set of filtered Trigrams that signal the `Promise` used in
your requests

```javascript
taoMiddleware.addResponseHandler({ t: 'space', a: ['load', 'list'], o: 'anon' })
```

### Setting Context (Signal)  with Simple Middleware in the TAO Signal Network

When a request comes into your `koa app` that you want to turn into a Signal into the TAO Signal
Network, you will make use of the `tao` prop on the `koa ctx` in the middleware handlers you
add after the `simpleMiddleware` is added.

```javascript
app.use(async (ctx, next) => {
  const reqData = getReqData(ctx.req);
  try {
    // Promise resolves with the AppCon handled by a ResponseHandler attached to the middleware
    // in this case we expect to get a {space,load,anon} with data containing a `Space` loaded
    // as a JSON object that is expected to return to the client
    const ac = await ctx.tao.setCtx({ t: 'space', a: 'find', o: 'anon' }, { id: reqData.spaceId });
    ctx.body = {
      space: ac.data.space,
    };
  } catch (err) {
    // timeout was reached
    ctx.status = 500;
  }
  return next();
});
```

## Enhanced Middleware

### Importing Enhanced Middleware

### Initializing Enhanced Middleware

### Add Enhanced Middleware to `koa app`

### Controlling the Promise with Handlers

### Setting Context (Signal) with Enhanced Middleware in the TAO Signal Network

## TAO HTTP Middleware

If your [koa][1] application server intends to use HTTP as an interface for extending a TAO
Signal Network to a backend, then you'll want to use the TAO HTTP Middleware in conjunctionn with
[TAO HTTP Client](../client-http/README.md) to wire up both networks as a single Signal Network
operating over HTTP.

Signals or AppCons in a Signal Network extended over HTTP will be shared seemlessly across the
physical network without additional implementation needed by you.

### Importing TAO HTTP Middleware

### Initializing TAO HTTP Middleware

### Add TAO HTTP Middleware to `koa app`

### Adding Response Handlers to TAO HTTP Middleware

### Validating TAO HTTP Middleware Setup


[1]: https://github.com/koajs/koa
[2]: https://github.com/koajs/koa#middleware
