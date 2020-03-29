# Glossary of Terminology

These are referenced throughout the guide and highlighted allowing mouse over views of
the definitions as well as links to these definitions.  Because the index is "dumb" so to
speak, there are repeated definitions with particular ordering so they render properly.

## tao.js

implementation of the TAO in JavaScript, including the core library as well as additional
packages to ease implementation of onboarding with other frameworks

## TAO-Path

A set of AppCons creating a sequence describing a value protocol

## TAO-Paths

A set of AppCons creating a sequence describing a value protocol

## TAO Programming Model

the core framework of defining a System using Application Contexts as a 3-Dimensional
representation of State and implementing the System using handlers that react to them.

For more see the [Motivations behind Why](intro/motivations.md) or the
[Intro: Basic Terminology](intro/basic-terms.md)

## Term

the _thing_ or _subject_ in the TAO's Application Context - conceptually usually a domain entity but not limited to only domain entities

For more see [Intro: Basic Terminology](intro/basic-terms.md#3d-tuples).

## Action

the _operation_ being performed on the _thing_ in the TAO's Application Context

For more see [Intro: Basic Terminology](intro/basic-terms.md#3d-tuples).

## Orient(ion)

the _perspective_ of the interaction with the system at the moment of this _operation_
on this _thing_ in the TAO's Application Context

For more see [Intro: Basic Terminology](intro/basic-terms.md#3d-tuples).

## Orientation

the _perspective_ of the interaction with the system at the moment of this _operation_
on this _thing_ in the TAO's Application Context

For more see [Intro: Basic Terminology](intro/basic-terms.md#3d-tuples).

## Orient

the _perspective_ of the interaction with the system at the moment of this _operation_
on this _thing_ in the TAO's Application Context

For more see [Intro: Basic Terminology](intro/basic-terms.md#3d-tuples).

## Application Context

Representation of a _State_ the System is transitioning to at a given point in time
described by a trigram with attached associated data.

For more see [Intro: Basic Terminology](intro/basic-terms.md#3d-tuples).

## Application Contexts

Representation of a _State_ the System is transitioning to at a given point in time
described by a trigram with attached associated data.

For more see [Intro: Basic Terminology](intro/basic-terms.md#3d-tuples).

## trigram prop

in the `@tao.js/react` package, one of the set of 3 props used to represent a TAO trigram for a
context, either the "term", "action" or "orient" prop which can be set on a `Component` from the
package

## trigram props

in the `@tao.js/react` package, the set of 3 props used to represent a TAO trigram for a context;
the props are "term", "action" and "orient" which can be set on a `Component` from the package

## trigram

literally to mean a sequence of 3, trigrams represent the 3 parts of a TAO context
consisting of the **t**erm, **a**ction and **o**rient(ation)

## trigrams

literally to mean a sequence of 3, trigrams represent the 3 parts of a TAO context
consisting of the **t**erm, **a**ction and **o**rient(ation)

## AppCon

An Application Context represented in code and coded to within a TAO-based System.

For more see [Intro: Basic Terminology](intro/basic-terms.md#appcons-are-actual-states).

## AppCons

An Application Context represented in code and coded to within a TAO-based System.

For more see [Intro: Basic Terminology](intro/basic-terms.md#appcons-are-actual-states).

## Inline Handler

A handler added to the TAO for the Inline Phase of execution of the TAO.

Inline handlers are the most common type of handler, used to provide basic handling of
Application Context transitions.

See more in the [Advanced: Inline Handlers](advanced/inline-handlers.md) guide.

## Async Handler

A handler added to the TAO for the Async Phase of execution of the TAO.

Async handlers are used to provide _out of band_ reactions on Application Context
transitions.

See more in the [Advanced: Async Handlers](advanced/async-handlers.md) guide.

## Intercept Handler

A handler added to the TAO for the Intercept Phase of execution of the TAO.

Intercept handlers are used to provide guard constraints on Application Context
transitions.

See more in the [Advanced: Intercept Handlers](advanced/intercept-handlers.md) guide.

## handler

A function added to the TAO for an Application Context that is called by the TAO
when an Application Context that matches is set on the TAO.

See more in the Basics Guide to [Defining Handlers](basics/defineg-handlers.md) and
[Adding Handlers](basics/handlers.md).

## VAR

Stands for Value-Added Reseller
