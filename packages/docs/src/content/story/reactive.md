# Reactive Development

As you think through the API you need to provide for the Platform, you start to consider how these
Applicaton Contexts should actually work:

What are Application Contexts from a development standpoint?

What does it mean for an Application Context to represent State?

How does a developer "hook into" or "subscribe to" an Application Context?

## Events

You realize that Application Contexts are State Events that can be triggered by the application
when the application needs to perform the work for that State.  Many Platforms and Frameworks are
already built this way, using predefined events to determine the extension points for developers
to "hook into" or "subscribe to" so you feel comfortable you're not doing anything too far
fetched.

What you have done new is to provide some dimensionality and richness to the scheme used to define
the events as well as the capability of subscribing to multiple events using a wildcard mechanism.
To your knowledge, neither of those have been done before.

So you decide to make a distinction between a materialized State with specifics captured in the
data associated with that state, and define that as an Applciation Context.  The "listener"
mechanism then defines which Trigrams that will match specific Application Contexts that it cares about.

We now have the following distinction to be clear:

| Name                | Definition                                                           | Can be Wild |
|---------------------|----------------------------------------------------------------------|-------------|
| Trigram             | 3-tuple determining which Application Contexts to subscribe to       | Yes         |
| Application Context | Specific state event of an application combining a Trigram with Data | No          |

This feels right as you look to translate how this mechanism will work to UI code that requires
not only display of viewable components to the user, but also the ability to react to what the
user does.

## Messages

From your early learning of Object Oriented Programming, you remember that method calls are
considered to be passing messages from one object to another.  There's several reasons why this is
the case, but as you think about it from the concept of method dispatch in a prototypal chain, it
makes sense that a call to a method is a message being sent and a search for the correct handler
of that message.

Events are just another form of message dispatch with an inverted "pointer" as to to the intended
target of the message.  With an object-to-object method call as a message, the caller is fully
aware of who the target of the message is.  With events using the [Observer Pattern](https://en.wikipedia.org/wiki/Observer_pattern),
to decouple the sender from the receiver as well as allowing there to be multiple receivers in a
fanout pattern.

If it's all messages in the end, you think, then why can't my Application Contexts be messages in
a network?

This would make the Platform more applicable to building applications that can cross process and
network boundaries, and distribute the execution of Features and Modules to where they need.

### Reactive Manifesto

This makes you feel even better about your choices now.  You realize that you've extended a very
simple extension point mechanism to fit a wide variety of usage scenarios while helping to ensure
applications can be built better to scale as needed.

You've designed the Platform to adhere to [The Reactive Manifesto](https://www.reactivemanifesto.org/)
and you're feeling even more confident now that you're not building a Platform that will become
brittle with age.  Especially this part:

> **Message Driven:** Reactive Systems rely on _asynchronous message-passing_ to establish a
> boundary between components that ensures loose coupling, isolation and _location transparency_.
> This boundary also provides the means to delegate _failures_ as messages. Employing explicit
> message-passing enables load management, elasticity, and flow control by shaping and monitoring
> the message queues in the system and applying _back-pressure_ when necessary. Location
> transparent messaging as a means of communication makes it possible for the management of
> failure to work with the same constructs and semantics across a cluster or within a single
> host. _Non-blocking_ communication allows recipients to only consume _resources_ while active,
> leading to less system overhead.

![The Reactive Manifesto](https://www.reactivemanifesto.org/images/reactive-traits.svg)
[Credit: The Reactive Manifesto site: https://www.reactivemanifesto.org/images/reactive-traits.svg]

## Message Flow

As you consider the implications of your decisions, you wonder about how Features builders can
take full advantage of a Platform that would provide this Network where messages get added and
delivered to anything that is listening for them.

You know with these latest decisions we can build our system to be Reactive, but you're not sure
if that alone is enough to handle all of the use cases that can come up for features of the Media
Management application.

There are times when we need to control if messages propagate and how messages propagate.

### Automatic Chaining

Often times we want to kick off a chain of our Application Contexts in response to an initial
stimulus.  To provide some control over the flow of those messages, you realize it would be
helpful if there was a way to automatically chain from one message to another.  In fact, chaining
into a full path of messages would provide 2 additional benefits to the Platform and its
extension mechanism:

1. Allow a dynamic assembly of handlers to provide a chain of value
2. Allow a dynamic set of hooks into which a new handler can be inserted at any time

You decide to design the Network so that if it receives an Application Context as the result
of a handler call, then it will use that as the next Application Context being set in the Network.
This also allows the handlers to not have to be aware of the Network in which they're being
attached, operating as pure functions which can live and execute anywhere giving even more
location transparency.

#### Inline

A basic and simple chaining rule is one where one Application Context comes after another
in a line so to speak, so that when the handler of an Application Context is finished, the next
Application Context is fired, and the next set of handlers pick it up.

#### Asynchronous

Having developed many applications that perform some sort of tracking, and knowing that our Media
Management application needs to have tracking of how long users watch content, you understand that
the tracking message itself should be an asynchronous process or side-effect of the watching
action.

Defining a chaining mechanism that allows for Application Contexts to be chained from one another
Asynchronously will allow extensions to be built that provide side effects when certain messages
are populated on the network.  These chains can in turn be longer when combined with [Inline](#inline)
handling to kick off whole message flows in an asynchronous execution.

#### Intercept

Finally, when you begin to consider security implications and how to handle authorization, you
realize there are times when you want to stop the propagation of a chain of Application Contexts.
In these cases, you want to Intercept an Application Context to inspect it and determine whether
it should propagate or not, and possibly provide the Network with an alternative Application Context
to follow instead.

This works for not only authorization scenarios but basic validation and many other scenarios
you may not anticipate yet.

### Prioritized Flow Control

While you like this model of having these 3 different types of mechanisms for chaining Application Contexts
together to provide value, you are worried about the deterministic behavior needed for developers
building Features:

* How can they be certain that their Intercept handler will be called?
* Haw can they ensure that their side-effects will always fire before the Application moves onto another Application Context?
* As a developer, do I have to ensure the order in which I attach handlers to the Network?  How can I do that in a dynamic execution environment?

You decide what's missing is clear Prioritization for how Application Contexts will be chained,
and come up with the following:

1. Intercept handlers will always fire first to determine whether the incoming Application Context is valid for further propagation in the network
2. Async handlers will always fire next in a way that spins off a new execution context, enabling all side effects that make it passed the Intercept to get triggered
3. All Inline handlers will be fired for the given Application Context before any new Application Contexts that are chained from Inline handlers are set in the network

## Platform Defined

With this in place, you realize you've defined everything you need to build a Platform that can be
used to not only build the Media Management application to meet the original [Requirements](reqs.md),
but you feel like you've defined something [a bit more](the-tao.md).  Something that is useful
beyond the needs of this project and generalized enough to apply to many more applications and
projects.
