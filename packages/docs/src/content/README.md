# tao.js

A new _way_ of developing software with a few simple goals (more in the [Intro: Motivations & Goals](intro/motivations.md))

1. Use a simplified language that _elicits_ communication between Engineers and Product Managers
1. Leverage that language to build the software
1. Build software with the intent that it will evolve

## What is tao.js?

Literally at the core, `@tao.js/core` is a simple package to use in _any_ App we build to
create Reactive Apps that espouse the principles outlined in the [Reactive Manifesto](https://www.reactivemanifesto.org/)
by implementing what's called the TAO in JavaScript.

The whole thing is designed around generating _3-Dimensional Events_ in the form of a tuple
with a specific shape that follows the acronym from its namesake (_T.A.O._):

**T**erm - the _thing_ in the context - conceptually usually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ of the interaction with the system at
the moment of this _operation_ on this _thing_  

These are affectionately called taoples describing specific tuples with this :point_up:
specific shape and appearing in this order.

Examples are:

* `{App,Enter,Admin}`
* `{User,Track,Portal}`
* `{Project,Create,Portal}`
* `{Task,Store,Reporting}`

These Events or Messages are defined in this way to be flexible enough to capture any
Application Context that can occur in any App while being closed enough so as not to
be infinitely diverse.

From there, we use the `TAO` export of the package to add our listeners, known as
handlers in tao.js, like this:

```javascript
import TAO from '@tao.js/core';

// add a handler
TAO.addInlineHandler({ t: 'Kids', a: 'Enter', o: 'Camp' }, (tao, data) => {
  // handler implements a reaction to the specific AppCon (Event)
  // - excerpted from: https://www.youtube.com/watch?v=Ub7MkK-a0hU
  alert(`Hi, kids! Welcome to Camp Krusty…<laughs>…I'll see you in a few weeks.
  Until then I've turned things over to my bestest buddy in the whole wide world,
  ${data.Camp.director}. I want you to treat ${data.Camp.director} with the same
  respect you would treat me. Now here's ${data.Camp.director}`);
});

// set the AppCon passing relevant data
TAO.setCtx({ t: 'Kids', a: 'Enter', o: 'Camp' }, {
  Camp: { name: 'Camp Krusty', director: 'Mr. Black' }
});
```

So there you have it.  On the surface it's very simple and easy to use.  Add handlers for
Application Contexts (AppCons) in the form of taoples and JavaScript functions with
2 arguments (the taople as `tao` and the particular `data` for this occurrence).  Next we
set those Application Contexts at the right time in the App to create the reactions.

With this simplicity comes a lot of power in the form of creating Apps that are:

* decoupled
* flexible
* designed to easily evolve
* easy to integrate
* horizontally scalable
* common Event-driven system across client & server
* common Message format for all environments

Give it a try and then read the guide that follows to learn more about all of the various
capabilities you get by the way the library was defined.

## There's more

tao.js encompasses a full JavaScript library of packages built to implement the TAO in
JavaScript including making it easy to integrate with other popular JavaScript frameworks
for building Apps.

All packages are published under the `@tao.js` namespace and available from the
[monorepo on Github](https://github.com/zzyzxlab/tao.js).

Currently there are packages to integrate with:

* React.js - [@tao.js/react](https://github.com/zzyzxlab/tao.js/packages/react-tao)
* Socket.io - [@tao.js/socket.io](https://github.com/zzyzxlab/tao.js/packages/tao-socket-io)
* and more to come…

## Tell me more about this TAO thingy

The TAO is a programming paradigm designed around splitting up any System or Application
into very granular constituent parts organized to respond to a common message format,
a 3-dimensional tuple (taople) with a very specific set of 3 attributes that
can be used to describe _any_ context which can occur within the System or Application
(known here as Application Context).

Describing a System or Application as a _Set of taoples_ has the specific intent of making
it easy to communicate in non-technical terms what the software _should_ or _intends_ to do.

Once the software has been sufficiently decomposed in this way, it is reconstituted thru
generating and passing these messages to functions known as handlers that perform the
value added activities of the program.

Leveraging the handler as the unit of execution allows the software built to run in
any execution environment.

## Power of a Common Form of Event & Message

By making all events and messages follow a common format, there is no longer any need
to negotiate particular interfaces between the various layers or parts of a System or
Application, thus making it a simplified programming paradigm to accept and encourage
best practices in building software.

The downstream beauty of this is the meta-data provided by all of these Events is easy
to siphon off to reporting and any other use for the data without additional effort
in the generation.
