# End Result

Our end result is the TAO Programming Model.  It starts from defining software as a set of
Application Contexts that an application will go through or allow, using
the TAO Trigram as the basis for the definition:

* **T**erm
* **A**ction
* **O**rient(ation)

From their the application is built creating code that sets Application Contexts as signals into a Network and creating handlers that attach to the Network as either:

* an Inline handler
* an Async handler
* or an Intercept handler

This programming model is designed around building Reactive applications that are scalable and resilient while being decoupled and focused on the evolution of applications.

In other words, adding features and functionality use a common built-in mechanism to the
Programming Model that provide consistency across the entire life of the application.

With the TAO Programming Model, we are able to realize the following benefits:

## Business-first Messaging Pattern

You realize that the TAO Programming Model with its use of Trigrams provides the first
business-first message pattern.  Because the concept of Trigrams came from Application Contexts
which came from how to describe the software from a requirements perspective that can translate
to engineers, the TAO Programming Model is the first outright messaging pattern defined from the
start to describe Domain Models and use Business Language from the Domain Model.

## Translating to Code

So you have an Event System that is also way beyond the events you're used to.  But this is good.
You're following successful patterns that have proven useful by making the platform event-based at
the same time you've made those events more descriptive and universal.  You're providing
a single common extension point mechanism to build anything for your applications while making the
Platform's callbacks more powerful.

Stepping back upstream a little, you realize the impact this could have.  Because the event
mechanism came in a straight line directly from an attempt to capture requirements, you realize
that the mechanism for developing the code of applications built using the Platform is directly
translatable to and from a language used to describe what the application needs to do.

As the Product Team works with the Engineering Team, using Application Contexts and Trigrams to
define the requirements of the application makes for a common language between the two teams,
the language is will not only pervade the Product Requirements documentation, it'll also be
visible directly in the code that is written to realize the requirements of the application.

## Decoupled from the Start

When building applications using the TAO Programming Model, the features are decoupled from the
start.  Relying on message passing to affect the behavior of the application much in the way a
Pub-Sub system works to decouple message Publishers from message Subscribers.  The TAO Programming
Model does this at a level where it is universal across your application.

As we know from the first half of the GoF Design Patterns book, the best way to decouple software
components is to:

> **Principal:** Design to an Interface

Effectively, building applications using the TAO Programming Model provides a mechanism for creating dynamic Interfaces.  Each Trigram represents an Interface to which a handler can attach
itself.

As new things or features are introduced to the application, new Trigrams will be formed based on
the Terms, Actions and Orientations of the feature.  New or old Features can attach to these
Trigrams at any time, awaiting matching Application Contexts and reacting to them.

## Platforms for Everyone

What if every application could be built as if it were a platform?

What if every application used the same mechanism to extend its functionality as it did to build
its first feature?

What if every application were built upon a mechanism designed for evolving the application over
the course of its lifetime, and that same mechanism was used to evolve it from its inception at
day 0?

That's the effect of using the TAO Programming Model.  It could be described as a Framework for
building Platforms.  You build up a Platform for your application that allows you to extend your
application as if you were extending on a Platform.  You also have the flexibility to make this
available to Integrators wanting to build for your application.

The beauty of the TAO Programming Model is that it provides a way for application developers to
build in a Platform design, a Platform mindset, without taking on the burdens of defining or
designing a Platform.  It comes as a Platform to start.  It is a Meta-Platform used to build
Platforms on which to build applications.

## No Lock-In

The TAO Programming Model itself also has no opinions about what technologies to use or how to
implement the functionality for interacting with a data store like an ORM.  So as a Framework,
you as a developer don't suffer from the strong opinions made for expediency.

Building applications using the TAO Programming Model, you are not locked into any specific
technology choices made by the Framework developers.  It's designed as a mechanism to help you
build applications that are expected to evolve, so the TAO Programming Model aids you in that
evolution.

## Decoupling Apps from Architecture

Because of the design of the TAO Programming Model, there is a clear separation between what is
used to define the Product and how that becomes part of the code as the App and the Network on
which the App's Application Context messages and message handlers operate as the Architecture.

Using the TAO Programming Model we can define Apps with:

* set of Application Contexts or Trigrams that the App will provide
* set of handlers to respond to Application Contexts
* and how those handlers attach to the Network

Also, with the TAO Programming Model we can define Architecture with:

* the Network used to carry Application Contexts

As long as the Network implements the guarantees provided by the TAO Programming Model, we are
free to change the App and Architecture independent of one another.  Adding new Application Contexts
and hanndlers will not affect the Network.  Changinng the Network implementation will not affect
the Application Contexts or handlers used to implement our App.

Learn more in the page [about it here](../intro/decoupling.md)

## Embracing Entropy

> All software heads toward entropy

… is a direct quote from my first career boss.

Since the TAO Programming Model was built to evolve from the start, it is designed to embrace this
fact as outlined further in [Entropy in Software](../intro/entropy.md)
