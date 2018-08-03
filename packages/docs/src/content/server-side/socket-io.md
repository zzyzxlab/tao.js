# tao.js for Socket.io

It's assumed you have read and are familiar with the [Basics](../basics/README.md) guide.
If not, then please go back and read through that before trying to learn how to use tao.js
with React.

Socket.io is the recommended way to make our server-side code run with the TAO because of their
mutual affinity.  Socket.io espouses an Event-driven paradigm that spans server and client as
opposed to the Request-Reply paradigm of traditional HTTP servers.

tao.js offers the `@tao.js/socket.io` package making it seemless to use Socket.io to bridge the TAO
across Client and Server.

To install `@tao.js/socket.io`, use:

```sh
npm install --save @tao.js/core socket.io @tao.js/socket.io
```
OR
```sh
yarn add @tao.js/core socket.io @tao.js/socket.io
```

`@tao.js/core` is (like in all other tao.js packages) a peerDependency required to make `@tao.js/socket.io` work.

`Socket.io` is a peerDependency rather than a direct dependency of `@tao.js/socket.io` to keep the
size of the package small when it's used on the client.

## Importing

`@tao.js/socket.io` is designed to be imported on both the client and server the export of a single
default function.  We must also use it to wire up the TAO so that should be imported as well:

```javascript
import TAO from '@tao.js/core':
import taoSocketIO from '@tao.js/socket.io';
```
OR
```javascript
const TAO = require('@tao.js/core');
const taoSocketIO = require('@tao.js/socket.io');
```

## Setting it up Server-Side

`@tao.js/socket.io` exports a single function as the default which is used on both the server and
client to wire up the TAO to Socket.io called `wireTaoJsToSocketIO` _(it helps to be explicit :smirk:)_

To wire it up on the server, we must get a reference to an instantiated `Server` that we get
from calling Socket.io's `IO(…)` default function or the `new Server` constructor.  If you're
unfamiliar with this, please check out the [tutorials at Socket.io](https://socket.io/docs/server-api/)
to learn how this works.  We then pass the Socket.io `Server` and the TAO to the wiring function
which will return a TAO Kernel (separated TAO) that will be mirroring all of the Application
Contexts of the client.

### Connecting the TAO on the Server

On the server we need to import the default from the `socket.io` package along with our imports
above:

```javascript
import IO from 'socket.io';
```
OR
```javascript
const IO = require('socket.io');
```

Depending on how we set up our server to run and what server-side framework we use for serving
Node.js Apps, we can then:

```javascript
const io = IO();
taoSocketIO(TAO, io, {
  onConnect: (clientTAO) => {
    // add handlers for individual client
    …
    // optionally return cleanup function on disconnect
    return () => {
      // clean up resources when socket is disconnected
      …
    }
  }
});
```
OR
```javascript
const server = http.createServer(…); // http or https packages shipped with Node.js
const io = IO(server);
taoSocketIO(TAO, io, {
  onConnect: (clientTAO) => {
    // add handlers for individual client
    …
    // optionally return cleanup function on disconnect
    return () => {
      // clean up resources when socket is disconnected
      …
    }
  }
});
```

What's going on above is that the `wireTaoJsToSocketIO` function is setting a new [`Namespace`](https://socket.io/docs/server-api/#Namespace)
on the `Server` and adding middleware to it that will proxy Socket.io events to the TAO.

In order to keep each client separate from the others, the `wireTaoJsToSocketIO` function accepts
as part of its options in the third argument an `onConnect` callback that will receive a newly
constructed TAO Kernel separate from the default global TAO.  This is important in allowing us to
handle and chain Application Contexts separately for each client.  _Optionally_ the `onConnect`
function can itself return a function that will be called when the socket is disconnected in order
to clean up resources set up _within_ the `onConnect` function.

The global TAO passed into the `wireTaoJsToSocketIO` function will also have Application Contexts
proxied to it from the client, and we can use these to react to them in a global way on the Server.

At this point we then have everything wired up for our server to leverage the TAO and react to
Application Contexts that originate across both execution environments.

## Setting it up Client-side

For wiring up the client, we use the same `wireTaoJsToSocketIO` function exported from
`@tao.js/socket.io` that we do on the server.

Just like on the Server we pass the TAO as the first argument, but unlike on the Server we do not
pass the Socket.io `Server` in the second argument, rather we pass the Socket.io [`Client`](https://socket.io/docs/client-api/)
that is available as the global `io` on the client `window`.

### Connecting the TAO on the Client

First, we must include the Socket.io Client scripts in our client App by either using the path
served by our Socket.io `Server` or a [CDN hosted script](https://cdnjs.com/libraries/socket.io):

```html
<script src="http://{your.hostname.com}/socket.io/socket.io.js"></script>
```
OR
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/{version}/socket.io.js"></script>
```

Then, we wire up our Socket.io `Client` to the TAO in our client App:

```javascript
const socket = taoSocketIO(TAO, window.io);
if (socket) {
  console.log('connected on socket');
}
```

What's going on above is that the `wireTaoJsToSocketIO` function is using `window.io` to connect
to the `Namespace` created for the TAO messages on our back end Socket.io `Server`.  Once it has
the `socket`, it proxies Application Contexts to and from the TAO to and from the `socket` in a
way that ensures those that originate on the client do not mirror and reverberate back for an
infinite loop.

## Why using a Namespace?

While it's beneficial to make the TAO _the way_ (paradigm) to build an App, it's not going to
force anyone not to use anything else.  Although Socket.io is the best way to integrate the TAO
across server & client, the sockets created can also be used for other things if desired, so it's
easiest to give the TAO its own space within the socket to operate so it doesn't interfere with
whatever else is going on, and more importantly isn't interfered with.

## Options to `wireTaoJsToSocketIO`

The third argument to `wireTaoJsToSocketIO` is an `opts` (options) object that can be used to
customize the behavior of our `Socket`s used to bridge the TAO across client & server.  Not each
one is relevant to both server and client, so the distinction will be made for each.

These options are:

* `namespace: string` or `ns: string` - override the default namespace used when connecting
  sockets for the TAO.  
  _this **must** be the same for **both** server and client in order to work_
* `onConnect: function` _(server only)_ - callback used to get a reference to a TAO Kernel created
  for each client that connects.  Ignored on the client.
  * this is important to ensure handlers for Application Contexts are not shared across all clients
    connected to our server for all Application Contexts
  * `return: function` _(optional)_ - optionally the function passed in as the `onConnect` option
    can return a function that will be called when the socket is disconnected (there is a
    [`'disconnect'` event](https://socket.io/docs/server-api/#Event-%E2%80%98disconnect%E2%80%99))
  * depending on your use case, this is not required.  If `onConnect` is not included, then a separate TAO Kernel is not created for each client
* `host: string` _(client only)_ - by default, Socket.io will connect to the same server that served
  the client App that is executing in the browser (using the page's origin url).  `host` allows us
  to connect to a different back-end server.  When doing this, you will need to ensure you've
  enabled CORS on your back-end server.  Ignored on server.

## More about `onConnect`

First, when integrating with Socket.io, using the `onConnect` option to get an individual TAO
per connection (`socket`) isn't required.  If our App doesn't do anything that is particular to a
User's session in the App, and **All AppCons are Global** then this is unnecessary.

With that statement out of the way, this is _**HIGHLY UNLIKELY**_ when building our App, so it's
important to understand why this provided.

Let's use an example to illustrate: from the examples in the [Basics of Defining Handlers](../basics/define-handlers.md#use-case-user-edits-space):

### Use Case: User Edits Space

A TAO-Path that represents when a user edits the details of a `Space`:

|#||Term|Action|Orient||handler spec|
|---|---|----|------|------|---|-----------|
|0|User hits edit|`Space`|`Edit`|`Portal`|`=>`|get the `Space` Edit form and put it in the UI|
|1|User hits cancel|`Space`|`Enter`|`Portal`|`=>`|go back to the [User Views Space](#use-case-user-views-space) TAO-Path|
|2|User hits save|`Space`|`Update`|`Portal`|`=>`|get the updated `Space` data and send it to the api|
|3|`=>`|`Space`|`Store`|`Portal`|`=>`|store the updated `Space`'s data for later retrieval in the `Portal`|
|4|`=>`|`Space`|`Store`|`Admin`|`=>`|store the updated `Space`'s data for later retrieval in the `Admin`|
|5|`=>`|`Space`|`Enter`|`Portal`|`=>`|go back to the [User Views Space](#use-case-user-views-space) TAO-Path|

### TAO-Path without TAO Kernel per Client

If we implemented the above using the TAO on the server, we would likely have handlers on the
server that are called on the taoples as follows:

|#||Term|Action|Orient||handler spec|
|---|---|----|------|------|---|-----------|
|2|User hits save|`Space`|`Update`|`Portal`|`=>`|receive updated `Space` data|
|3|`=>`|`Space`|`Store`|`Admin`|`=>`|store the updated `Space`'s data for later retrieval in the `Admin`|
|4|`=>`|`Space`|`Store`|`Portal`|`=>`|store the updated `Space`'s data for later retrieval in the `Portal`|
|5|`=>`|`Space`|`Enter`|`Portal`|`=>`|go back to the [User Views Space](#use-case-user-views-space) TAO-Path|

This is all fine and works well enough on its own, but what happens if there is more than one
client attached to the server?

The `{Space,Update,Portal}` will only be set once (what we want), but after both `{Space,Store,*}`
Application Contexts are set, they chain to the `{Space,Enter,Portal}` Application Context.

This would get proxied to all clients and set the Application Context to `{Space,Enter,Portal}`
for all of them.  While this would seem normal to the initiator client, this would be very
strange for all other clients.

### Using a TAO Kernel per Client

When the callback `onConnect` is called, it is due to the `'connect'` event on our Socket.io
`Server`.  This can happen any time and for the same Socket.io `Client` over and over.

Because of this, anytime a Socket.io `Client` disconnects, `@tao.js/socket.io` will attempt to
remove the client's specific TAO Kernel.  The `onConnect` function we provide can also return
a `Function` that `@tao.js/socket.io` will use to clean up when the socket disconnects.

This interface allows us to prevent memory leaks and calling functions on sockets or TAO Kernels
that no longer exist in a simpler model to work with clients that can connect and disconnect at
any time with no guarantees of reconnecting.

Thus the interface allows us to program our `onConnect` handler as if it's the first time every time.

### TAO-Path with TAO Kernel per Client

Let's extend our example from above into code for when we use the `onConnect` method to implement
the desired behavior:

```javascript
const io = IO();
taoSocketIO(TAO, io, {
  onConnect: (clientTAO) => {
    clientTAO
      .addInterceptHandler({ t: 'Space', a: 'Update', o: 'Portal' }, (tao, data) => {
        // validate user authorization to perform Update on this Space
      })
      .addInlineHandler({ t: 'Space', a: 'Update', o: 'Portal' }, (tao, data) => {
        // chain to storing the updates in Admin db
        return new AppCtx('Space', 'Store', 'Admin', data);
      })
      .addInlineHandler({ t: 'Space', a: 'Store', o: 'Admin' }, async (tao, data) => {
        const { Space, Update } = data;
        try {
          const result = await adminDb.spaces.save(Object.assign({}, Space, Update));
          if (!result || !result.ok) {
            return new AppCtx('Space', 'Fail', 'Admin', Space, { on: tao.a, Update, error: 'result not ok' });
          }
          // success => chain to storing the updates to the Portal db (or cache)
          return new AppCtx('Space', 'Store', 'Portal', Space, Update, data.Portal);
        }
        catch (saveErr) {
          return new AppCtx('Space', 'Fail', 'Admin', Space, { on: tao.a, Update, error: saveErr });
        }
      })
      .addInlineHandler({ t: 'Space', a: 'Store', o: 'Portal' }, async (tao, data) => {
        const { Space, Update, Portal } = data;
        try {
          const updatedSpace = Object.assign({}, Space, Update);
          const result = await portalDb.spaces.save(updatedSpace);
          if (!result || !result.ok) {
            return new AppCtx('Space', 'Fail', 'Portal', Space, { on: tao.a, Update, error: 'result not ok' });
          }
          // success => chain to sending the user back into the individual Space in the Portal
          return new AppCtx('Space', 'Enter', 'Portal', updatedSpace, null, data.Portal);
        }
        catch (saveErr) {
          return new AppCtx('Space', 'Fail', 'Portal', Space, { on: tao.a, Update, error: saveErr });
        }
      });
  }
});
```

In the above, we are only handling the TAO-Path on the server for the TAO Kernel that is mirroring
the client for us, and no other clients will be affected by the interaction.

### `onConnect` Return Value

As mentioned [above](#connecting-the-tao-on-the-server) [several](#options-to-wiretaojstosocketio) [times](#using-a-tao-kernel-per-client),
we can **return a `Function`** from our `onConnect` function.  This function will be **called** by
`@tao.js/socket.io` on the server when our client `Socket` disconnects (there is a
[`'disconnect'` event](https://socket.io/docs/server-api/#Event-%E2%80%98disconnect%E2%80%99)).

The purpose of this function is to give us the opportunity to **clean up any resources** we are using
for the specific client socket connection.

We'll see an example of it below when using the global TAO to send AppCons [back to the client](#sending-back-updated-counts).

### What about global TAO?

Now that we understand how to implement client-specific handlers for Application Contexts, what is
the use of the global TAO on the server?

First, when using `@tao.js/socket.io` to wire up each `socket` per client connected to our
Socket.io `Server`, beyond creating a TAO Kernel per client (when the `onConnect` callback option
is used), the `wireTaoJsToSocketIO` function is also ensuring all Application Context traffic is
being set on the global TAO.

This becomes useful to allow our server to react to Application Contexts in a global fashion.

For a simple example, let's say we want to keep a simple counter for how many current users are
viewing each individual Space.  We might define our AppCons and handlers as:

|#||Term|Action|Orient||handler spec|
|---|---|----|------|------|---|-----------|
|0|User selects Space|`Space`|`Enter`|`Portal`|`=>`|AC signaling actor is entering an individual `Space`|
|1||`Space`|`Enter`|`Portal`|`=>/`[^a]|track entrances to `Space`s|
|2|`=>`|`Space`|`View`|`Portal`|`=>`|get the `Space` View and put it in the UI|
|3|`=>`|`Space-Phrase`|`Find`|`Portal`|`=>`|fetch all of the `Space-Phrase` relations from the api|
|4|`=>`|`Space-Phrase`|`List`|`Portal`|`=>`|show the list of `Phrase`s for a `Space` in the UI|
|5|`\`<a name="fn_a">a</a>`=>`|`Space`|`Enter`|`Track`|`=>`|increment entrance count for `Space`|

And we would implement this (abbreviated) as:

```javascript
// on the CLIENT
TAO
  .addInlineHandler({ t: 'Space', a: 'Enter', o: 'Portal' }, (tao, data) => {
    return new AppCtx('Space', 'View', 'Portal', data);
  })
  …
```

```javascript
// on the SERVER
TAO
  .addAsyncHandler({ t: 'Space', a: 'Enter', o: 'Portal' }, (tao, data) => {
    return new AppCtx('Space', 'Enter', 'Track', data);
  })
  .addInlineHandler({ t: 'Space', a: 'Enter', o: 'Track' }, (tao, data) => {
    const { Space } = data;
    if (!spaceCounters[Space.id]) {
      spaceCounters[Space.id] = 0;
    }
    spaceCounters[Space.id]++;
  });
```

This means our client never worries about the tracking code or even the chain to it and our server
can react to the `{Space,Enter,Portal}` in a way that is meaningful to the server, first by
asynchronously chaining to `{Space,Enter,Track}` and then using that Application Context to then
update the counter.

_Optionally, the counter increment could have simply been within the server-side Async Handler on
`{Space,Enter,Portal}`, but we took the opportunity to illustrate an alternative Orient(ation)
we might use for our Application Contexts._

#### Sending back updated counts

Now, we can use this to feed back to all of our clients the current view count by making a few
more changes:

```javascript
// on the SERVER
const spaceCounters = {};

TAO
  .addAsyncHandler({ t: 'Space', a: 'Enter', o: 'Portal' }, (tao, data) => {
    return new AppCtx('Space', 'Enter', 'Track', data);
  })
  .addInlineHandler({ t: 'Space', a: 'Enter', o: 'Track' }, (tao, data) => {
    const { Space } = data;
    if (!spaceCounters[Space.id]) {
      spaceCounters[Space.id] = 0;
    }
    spaceCounters[Space.id]++;
    return new AppCtx('Space', 'Tracked', 'Portal', { id: Space.id }, spaceCounters[Space.id]);
  });
…

const io = IO();
taoSocketIO(TAO, io, {
  onConnect: (clientTAO, onDisconnect) => {
  // keep reference to handler we will need to remove
  const forwardSpaceTracked = (tao, data) => {
    clientTAO.setCtx(tao, data);
  };

  // forward the AppCon to the client
  TAO.addInlineHandler(
    { t: 'Space', a: 'Tracked', o: 'Portal' },
    forwardSpaceTracked
  );

  // return function used for cleanup when socket is disconnected
  return () => {
    console.log('disconnected client - removing TAO handler');
    // remove the handler so we don't call clientTAO.setCtx after it's been disconnected
    TAO.removeInlineHandler(
      { t: 'Space', a: 'Tracked', o: 'Portal' },
      forwardSpaceTracked
    );
  };
  …
});
```

```javascript
// on the CLIENT
TAO
  …
  .addAsyncHandler({ t: 'Space', a: 'Tracked', o: 'Portal' }, (tao, data) => {
    const { Space, Tracked } = data;
    // somehow update a current entered/viewer count on the space if the current Space is in view
    updateSpaceViewers(Space.id, Tracked); // <-- Tracked is a Number
  })
  …
```

Obviously this can be used for much more complex cases than this, but we hope it illustrates the
point.  If you have a better example that's as easy to communicate, please submit a PR :smile:

One that comes to mind is updating all clients viewing a Space when that Space gets an Update
stored in the database.  This will require a little bit of thought that I don't have right now
:stuck_out_tongue:
