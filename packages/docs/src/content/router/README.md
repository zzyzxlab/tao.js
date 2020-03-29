# URL Handling wtih `@tao.js/router`

## Routing Philosophy

The `@tao.js/router` starts from philosophy that URL manipulation by a Single Page App (SPA)
serves the following purposes:

1. Provides an initial context to the application when a user first navigates to it
1. Exists as an external serialization/reflection of a current state of the application to make that application context sharable

Because the URL is generally seen in this :point_up: way as both a side-effect of a running
application and an initiator to the start of an application, we gain more power and flexibility in
dealing with the URL as a part of our application by splitting both of these purposes up into 2
distinct ways of interacting with the URL.

### Why split the routing like this

With the advent of SPAs, url routing within the application is different.  On a server, if a resource
is requested that does not exist, according to the HTTP Protocol, the server returns a
`404 NOT FOUND`.  However, within an SPA, if a resource does not exist, what should we do?

In my opinion the better user experience is not to take the user to a page that doesn't exist, but
for the application to react accordingly when a resource requested does not exist.

From that standpoint, the URL in the SPA is the reflection of the current context of the application,
and the user should only get there in the successful (or "happy") path.

### Add/Remove TAO Trigram to/from Route

The first and most used interaction is to configure our Router to react to trigrams signaled in the TAO so the URL of our application is updated to reflect the current application context.

The API is described below, but the concept is that we are `Add`ing the `Route` to our app so that
it will react to a TAO trigram when an Application Context is signaled that matches the trigram.
`@tao.js/router` supports and encourages usage of Wildcard trigrams
so that the `term`, `action` or `orient`ation can be serialized into the route itself, meaning we
can have fewer actual routes to configure in our app.

If modules are loaded dynamically during the execution of the App, `Route`s can be dynamically
added and removed from the router.

Because `@tao.js` espouses the UI to react to Application Contexts signaled in the TAO (using
libraries like [`@tao.js/react`](../react-tao)), we are not reliant on the URL to tell the App
what UI views or components should be mounted and visible in the App.  What we need then is the
router to reflect what is happening in the App to make it a specific context a user can share
or rejoin at any point.

### Attach/Detach TAO trigram to/from Route

The second interaction relates to triggering an initial context when a user comes to the App for
the first time.  
_(We'll discuss browser `back` & `forward` later below)_

When a user comes to the app, we need to signal to the TAO what application context is set based
on the incoming route of the user to the app.

To do this, we use `Attach` to tell the Router which trigram to use to signal the TAO which
Application Context we want triggered based on the incoming route.

#### Why isn't this the same as the TAO Trigram `Added` to the Route?

First, it can be.  There's nothing in the Router preventing this, and you can pass the `attach`
option to the `Add` call that will signal to the Router to attach the same trigram configuration
to the Route so you won't have to make 2 explicit calls.

However, the philosophy of building applications with the TAO is to break up your application into
more granular Application Contexts (as trigrams) so that we have finer grained handlers that only
have one responsibility as well as more points to inject new behaviors down the road.

When building your TAO-based application like this :point_up:, it's advantageous to split up the
Add vs Attach so that the same Route can be used:

1. as the result of a successful chain of Application Contexts (the trigram `Add`ed to the Route)  
OR
1. to initiate the same chain of Application Contexts (the trigram `Attach`ed to the Route) to kick off a chain of Application Contexts (via
`Attach`) when the user first comes to the app and also be a reaction to an ending Application Context (via `Add`) once the user is interacting with our app as an SPA signaling ACs as they go.

