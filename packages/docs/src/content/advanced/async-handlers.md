# Async Handlers

Async Handlers provide us with the option of reacting to Application Contexts set on the TAO
in a "tangential" asynchronous execution outside of the normal line.

Generally, this is used for creating side effects of the Application Context.

## Async not `async`

In the TAO, Async Handlers are not `async` handlers, which are functions added
to the TAO as handlers for Application Contexts which happen to operate using JavaScript
[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)s.

Due to not implementing this library sooner (the original inception was before the `async` keyword
existed in C#) as well as not being able to think of a better word to capture its meaning, Async
Handlers exist to provide a way to react to Application Contexts apart from [Inline Handlers](inline-handlers.md), _out-of-band_ from a sequential set of operations.

## Origins of Async Handlers

The original intent was specifically to provide execution on a separate thread when this was
more difficult and clumsy to code (in C# and Java), and give control of the main thread back
to the caller.  Or, exactly what the `async` keyword itself has come to be for modern languages.

Although the implementation of the TAO (which is now only in JavaScript, a language that is
"single-threaded") has changed based on the changes in languages since its inception, the concept behind Async
Handlers remains and provides a specific need when modeling Systems and Applications apart
from the implemention details associated with asynchronous calls to network or other resources.

The underlying implementation of Async Handlers, while important, may change to get closer to
the ideal so you should not rely on how it is implemented now, rather rely on the interface and
guarantees provided by the TAO's handling of Async Handlers.

## Async = Out of Band

The purpose of Async Handlers is to allow our Systems and Apps to react to Application Contexts
in a separate execution context apart from the one that set the Application Context on the TAO.
We call this _out of band_ execution because the intent is that the main line of execution
will continue without regard for the Async Handler or its eventual conclusion.

From an Event-based development perspective, Async Handlers provide a mechanism to fire off
reactions and not care where they go or what they're doing and get back to the main line
of execution (mostly captured using [Inline Handlers](inline-handlers.md)).

For it's part, the TAO will execute each Async Handler within its own execution context ensuring
that any Inline Handlers are not affected by any Async Handlers.

## What makes for using an Async Handler?

It's tempting to use Async Handlers when deciding to make calls that would use an `async` function
(or Promises).  However, that's not always the designed intent of Async Handlers.

Let's use an example to illustrate fetching data from an API that needs to be rendered in a UI.

From this example, this would be a sequence better modeled using Inline Handlers due to the
ordered nature of the operations along with Inline Handlers' ability to handle, block and chain
using `async` functions.

## Describing Async Handlers for our Apps

Based on the example above, because there's a very sequential ordering of Application Contexts
to move the App from one _State_ to the next, the handlers are better added to the TAO as
Inline Handlers rather than Async Handlers.

We want to use Async Handlers to react to Application Contexts when we need "Out of Band"
operations.

Let's use an example of bootstrapping our App on the front end when a user first comes to the
Home Page.  We want to either fetch an existing Session or initialize a new Session, and we
want this to happen out of band so it doesn't block the User's experience of getting the Home Page.

We'll now add our Session to our previous example [Use Case: User Enters the App](../basics/define-handlers.md#use-case-user-enters-the-app)
in the Basics [Defining Handlers](../basics/define-handlers.md) guide:

### Use Case: User Enters the App

From our earlier example, the intial Use Case of a User coming to the App, the AppCons we
defined and the handlers that need to perform:

#### TAO-Path: Bootstrap Home Page

|#|chain|Term|Action|Orient|mode|handler spec|
|---|---|----|------|------|---|-----------|
|0|Open App|`App`|`Enter`|`Portal`|`=>`|initialize `App` data and prepare the UI|
|1||`App`|`Enter`|`Portal`|`=>/`[^a]|kick off getting User's `Session` by chaining to [Bootstrap User Session](#bootstrap-session)|
|2|`=>`|`App`|`View`|`Portal`|`=>`|get the Portal's containing View and render it|
|3|`=>`|`Space`|`Find`|`Portal`|`=>`|fetch all of the `Space`s from api|
|4|`=>`|`Space`|`List`|`Portal`|`=>`|show the `Space` List View in the Portal|

Notice the duplicated taople (`{App,Enter,Portal}`) added to the table and new (`=>/`[^a] ) mode
symbol.  The mode symbol is a way to distinguish handling an AppCon asynchronously (`=>/`)
vs inline (`=>`), where the Async Handler can include a reference ( [^a] ) to another TAO-Path
or chained AppCon.

In the above table, we're stating that after the `{App,Enter,Portal}` AppCon, we want to both
asynchronously kick off a search for the User's Session (_Bootstrap User Session_[^a] ) and
inline View the Portal (chained as `=>` `{App,View,Portal}`).

Because Async Handlers create an out of band execution context, we separate the description
into a new table below.

#### TAO-Path: Bootstrap User Session {#bootstrap-session}

|#|chain|Term|Action|Orient|mode|handler spec|
|---|---|----|------|------|-----------|
|0|<a id="fn_a">a:</a>`=>`|`Session`|`Find`|`Portal`|`=>`|find the current `Session` for the User<br/>if the `Session` **isn't found**, create a new one [^1a]<br/>if the `Session` **is found**, enter it [^1b]|
|1|`\`<a id="fn_1a">1a:</a>`=>`|`Session`|`Create`|`Portal`|`=>`|create a new `Session` then enter it [^1b]|
|2|`\`<a id="fn_1b">1b:</a>`=>`|`Session`|`Enter`|`Portal`|`=>`|set the `Session` local to the App|

Here we see new chain symbols (`\`<a name="x">xx:</a>`=>`) describing a situation where the App may
enter different Application Contexts depending on what the result of the previous handler is.

In this example, the `{Session,Find,Portal}` may or may not find a User Session, in which
case we want to communicate which AppCon is triggered depending on the outcome.

The backslash (`\`) preceding the normal chain arrow (`=>`) denotes that the result will not fall
through to the row below.

**TAO-Path: Refined Bootstrap User Session**

Finding a Session may also lead to fetching a User in order to personalize the App as well
as fire off Tracking code for the visit.

|#|chain|Term|Action|Orient|mode|handler spec|
|---|---|----|------|------|-----------|
|0|<a id="fn_a2">a2:</a>`/=>`|`Session`|`Find`|`Portal`|`=>`|find the current `Session` for the User<br/>if the `Session` **isn't found**, create a new one[^2a]<br/>if the `Session` **is found**, enter it[^2b]|
|1|`\`<a id="fn_2a">2a:</a>`=>`|`Session`|`Create`|`Portal`|`=>`|create a new `Session` then enter it[^2b]|
|2|`\`<a id="fn_2b">2b:</a>`=>`|`Session`|`Enter`|`Portal`|`=>`|set the `Session` local to the App|
|3||`Session`|`Enter`|`Portal`|`=>/`|update analytics tracking with `Session` data|
|4|`+=>`|`User`|`Find`|`Portal`|`=>/`|fetch the `User` in the `Session` from the api|

Which would then lead to its own TAO-Path for Getting the User which we want out of band
from the Bootstrap User Session TAO-Path.

## Adding Async Handlers to the TAO

Adding Async Handlers to the TAO is similar to adding Inline Handlers, except we're
going to call the `addAsyncHandler` method instead:

```javascript
// add Async Handler to trigger our out of band search for the User's Session by chaining
TAO.addAsyncHandler({ t: 'App', a: 'Enter', o: 'Portal' }, (tao, data) => {
  return new AppCon('Session', 'Find', 'Portal');
});

// add Async Handler to fetch a User when a Session is entered
TAO.addAsyncHandler({ t: 'Session', a: 'Enter', o: 'Portal' }, (tao, data) => {
  return new AppCon('User', 'Find', 'Portal', {
    Find: { id: data.Session.userId }
  });
});

// update tracking for user in external tracking system
TAO.addAsyncHandler({ t: 'Session', a: 'Enter', o: 'Portal' }, (tao, data) => {
  tracking.updateSession(data.Session, data.Portal);
})
```

## Async Handlers don't block

By their very definition, Async Handlers do not block the `setCtx` or `setAppCtx` calls
on the TAO.  The TAO will cycle through all of the handlers in the same order described
in [Inline Handlers Ordering](inline-handlers.md#inline-order-guarantee) but **unlike**
Inline Handlers, Async Handlers **provide no guarantees** around ordering.

The non-blocking means that if any of the handlers called within an Async Handler do
use a Promise, then another Async Handler execution context can take over execution.

## Chaining Async Handlers

Often, as seen in the examples above, an Async Handler is used to chain to a new
set of AppCons by simply returning the new AppCon that will kick off the new
TAO-Path within the new execution context that the TAO provides and do nothing else.

This is an effective way of utilizing Async Handlers to create a clear and meaningful
fork in execution and should not be seen as "cheating" or excess verbosity.  The purpose
being served is to provide relevant semantics to the desired logic of our App.

When chaining by returning an `AppCon` from an Async Handler, the TAO will set
the AppCon within the execution context for the Async Handler.  Because each
individual Async Handler is executed within its own context, a whole new set of
handlers of all types can be executed within this execution context.

## Error Handling - All Errors are Swallowed

Async Handlers differ from the other types in that because the TAO provides a new
execution context for them, to ensure the TAO can guarantee any code cannot
unintentially blow up the App, the TAO will **swallow any** `Error`s thrown
within the Async Handler or any downstream (chained) handlers.

```javascript
TAO.addAsyncHandler({ t: 'User', a: 'Find', o: 'Portal' }, (tao, data) => {
  throw new Error('I can\'t find Users now!');
});

TAO.setCtx('User', 'Find', 'Portal'); // <---- Error swallowed
```
