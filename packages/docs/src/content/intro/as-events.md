# From Client-side Event-driven Dev to tao.js

Many of you will be coming from Client-side development which is Event-driven, relying on the user
to begin interactions that drive what the application does.

## tao.js operates as Event-driven

This is good news because you're already used to attaching an event handler to UI components in
order to react to when the user interacts with that component.

`tao.js` provides the same mechanism in which you attach handlers to the TAO and implement the
functionality of your application using those handlers.

Similar to Event-driven architectures, you can attach as many handlers as you

There are a few differences that you will need to know to understand:

### TAO uses Domain Events

When building applications with `tao.js`, the events that you will listen for will be Domain-specific (Business-oriented) as opposed to Component-specific events.

### TAO events are 3-Dimensional

Most of the events you're used to can be considered 1-Dimensional or 2-Dimensional.

1-Dimensional in the sense that you can only attach to events by their name.

2-Dimensional in the sense that you can only attach to a named event on a specific object or
component.

TAO uses 3-Dimensional events that represent not only the object target (as term) and the action
being performed but also the orientation of when and where the event is occurring to form a
complete Application Context from the Domain.

### TAO allows Wildcard Handlers

How many times have you wanted to attach a handler that could listen for many events of a similar
nature?

TAO handlers can be attached using a wildcard for any of the 3 dimensions or any combination of the
3 dimensions of a message.

## Similar to the Flux Pattern

The TAO Programming Model espouses a pattern very similar to the Flux Pattern for forward-only
data flow.  The TAO Programming Model operates on events that are messages which are sent in a
forward-only pattern.

If you've used any of the popular Flux Pattern libraries like Redux.js, mobx, flux.js, or even
rolled your own, you will be familiar with how to build applications using `tao.js`.

Here are the following traits to pay attention to:

### Common Bus

Similar to these libraries, `tao.js` implements a common bus for event messages in the form of a
Signal Network.  All events/messages are set in the TAO's Network and all handlers are attached
to the Network.

### Network Chains Events for you

The TAO Programming Model and `tao.js` also provides a feature by which event messages can be
chained together.

When a handler returns an `AppCon`, the Network will propagate the message back into the Network,
triggering a call to the handlers listening for that `AppCon`'s trigram.

### TAO has different types of Handlers

The Event-driven systems you're used to only have one type of handler.  The TAO and `tao.js`
provides 3 different types of handlers:

* [Inline](../advanced/inline-handlers.md) - these are the same as the handlers you're used to
* [Async](../advanced/async-handlers.md) - special handlers that execute in an asynchronous thread
* [Intercept](../advanced/intercept-handlers.md) - special handlers that are called first and can determine whether the message should propagate to the other handlers or not

### Removes the distinction of an API

The goal of the TAO Programming Model is to remove the distinction about where code is executing
in a handler and allow the chosen Network implementation to consider that.

From this standpoint, your client-side code will not need to worry about whether a call needs to
go to an API or not, as your code should populate the Network with what it's doing and expect
messages to make their way to the necessary destination in order to fulfill the desired outcome.

Like a forward-only pattern, the result of a series of messages will make its way back as another
message for which you will attach a handler.
