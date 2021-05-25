# Solve Technical Debt by Decoupling Apps from Architecture

## Self Intro

I'm Jeff Hoffer

## Talk Intro

Many years ago I was part of a team working on yet another rewrite/rearchitecture of a system
because the current one was so bad … really bad. Like epically bad from a code and design
standpoint yet we still sold it for $70k / server license
In this case it was a flagship product for the company I was working for at the time, Accordent
Technologies (later acquired by Polycom).

During this time I reflected on what would be the best way to build a new Portal-based product
that could be extended easily, performant and packaged. I came to an idea that hasn't been able to
leave me, and it's taken a while to put the pieces in place to where I think it has value for
others.

### Tech Debt

* we've all experienced the pain of Tech Debt
* starting a project, do we build fast or build right? A _Kobayashi Maru_ problem
* enter rapid dev frameworks, have you ever tried to customize one of these to do something it's not designed to do? Unfortunately I have along with inheriting someone else's version of customizing them on several occasions
* … or worse, have to move off of one completely?
* junior (or younger you) makes bad tech choices and you have to live with or move away from them

### Dream of a better way

* wouldn't it be great to use the technologies you like to use in a framework of your own making?
* wouldn't it be great to avoid lock in on technology choices?
* wouldn't it be great to progressively remove Tech Debt from your apps?
* wouldn't it be great to iterate on introducing new tech & remove old tech?

### There is a better way

It's so simple … just:

… Decouple All the Things!

ok - seems right, conceptually I'm there with you … but how in the $#&% do I actually accomplish
that?

## How can we decouple all the things

Let's start from the Beginning

### What is an App?

* a series of contexts a user or system moves through that hopefully generates value
* the user or system interacts with the app to trigger a new context
* the user or system provides data as input, the app generates, manipulates and stores the data, and spits it back to the user or system when requested

… in other words, the _What_ (contexts) and _When_ (triggers & handlers)

### What is Architecture?

* a series of answers to the questions a developer has when they're tasked to build a feature
* the choice of database, network protocols, server/serverless, frameworks, etc. on which to build the App

… in other words, the _How_ (technologies) and _Where_ (runtimes & processes)

### Decoupling with Events

* Well-known solution to decoupling is thru event-based or message-based reactive systems
  * [The Reactive Manifesto](https://reactivemanifesto.org/)
* UIs are built this way using Observers

… but Events are implementation details, right?

### App Events need more

* Events we're used to can be considered:
  * 1-dimensional - string descriptor - `on('click', …)`, `on('data', …)`
  OR
  * 2-dimensional - plus target - `button.on('click', …)`, `socket.on('data', …)`
* Apps are richer - what about a 3-dimensional event?
  * *T*erm - what thing is part of the context - an entity, relationship, object, any _thing_
  * *A*ction - what is happening right now - create, update, find, list
  * *O*rient - from what perspective is it happening - user, admin, logged in, anonymous, reporting

… we'll use Application Contexts as Events with our 3-tuple called a Trigram using App Terminology

### Decoupling using Rich App Events as Signals

* Our Events are really Signals
* Subscribe to Trigram (`{ term, action, orient }`) Signals
* Receive Application Contexts (trigram + data) in handlers
* Becomes a Dynamic Interface for your app

### Wildcards

* Subscribe to classes of Signals - haven't you always wanted to do this?
* Wildcard subscriptions for more decoupling fun
  * `{ foot, *, home }` - everything that happens to a `foot` in the `home`
  * `{ *, find, * }` - any search
  * `{ *, *, * }` - every signal

## Ok - getting better - how do I use these Signals?

First we need to start with a medium for sending, triggering, setting Signals as Application
Contexts.
We'll call it a …

### Signal Network

* This concept predates the work presented here (why I switched to using this name)
* A single Signal Network across your whole App Stack
* Architecture is implemented via the choice of a Signal Network
  * defines the _How_
  * defines the _Where_

#### Signal Network defines the How

_How_ a Signal Network is connected across your App is up to you:

* REST API
* Websocket
* GraphQL API
* gRPC
* Message Broker (RabbitMQ, Kafka, Kinesis, etc.)
* Brokerless Messaging (ZeroMQ, nanomsg, etc.)

#### Signal Network defines the Where

_Where_ the Signal Network calls your handlers is also up to you:

* Web browser
* Mobile App
* Desktop App
* Server
* Serverless fuction

## Have we Decoupled the App from Architecture? Almost

We can set our Signals in the Signal Network, but how do we attach our Handler code (the _When_):

* Standard/expected event-style callback handlers
* Super Powered callbacks to do what Apps need

### Standard Callbacks

Inline Handlers on a Trigram Signal work just like you expect from events you're used to:

* called in the order in which they were added
* all will be called

### Sometimes I need side effects - Super Power

Async Handlers are used for side effects when you need fire and forget, get out of the way, or
to generate a parallel execution:

* get their own execution context
* execution passes to the next without waiting for completion

### Sometimes I need to prevent events - Super Power

Intercept Handlers are used to control flow of Signals, to check, stop and prevent and even
redirect the flow of Signals:

* if handler passes back a truthy value, don't call the rest
* useful for just listening (always called)

## Decoupled Yet?

I feel like I'm on those last few dates where it's not fun anymore and we just fight

We're still missing 2 key ingredients that get us out of this toxic relationship

### Deterministic Handling

How do I know when my handler will be called?

When a Signal is fired, handlers are always called in the following order:

1. Intercept - if all pass, go to the Async handlers
2. Async - ensure all side effects get called before making Inline calls
3. Inline - call all ordered Inline handlers

### Signal Network's Feedback Loop - Super Power

A handler can return an Application Context to be triggered back into the Signal Network

* Intercept handlers can use it to redirect the Flow of Signals
* Async handlers can be used as the start of a parallel execution that is continued with more Signals
* Inline handlers can chain to more Signals

### Did Someone Say Extension Points? - Genie Power

PHENOMENAL COSMIC POWERS! Itty-bitty living space!

Signal or App Con Chaining leads to very granular control over the flow of handlers:

* build your own framework by documenting your App's Signals
* build chained Protocols of Signals to document what your App does
* extend the app at any point by listening or generating a new Signal

## Conclusion

It took me some time to not only come up with all of these things but then to figure out how to
build it and even harder, explain it to others.
It's definitely borrowing from previous work while also being conceptually new to many people

### tao.js

* I have implemented these concepts in a library called tao.js (code samples either now or during)
* visit tao.js.org to learn more
* I want people to try it and especially looking for people passionate about making it easy to solve this problem of technical debt and build this ecosystem with me
