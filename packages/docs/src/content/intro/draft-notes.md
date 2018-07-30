# Motivations for tao.js

So why do we need tao.js?  Don't we have libraries and frameworks that do this already?

There are several motivations behind creating tao.js that originate from a need to
describe software effectively for technical (developers, QA, etc.) and non-technical
(product managers, designers, etc.).

This original need _led to_ the creation of tao.js as a way to _build applications
and systems_ which then presented an opportunity to achieve the original inspired intent
through a simple grammar.

We'll step through each motivation

## Build Applications Designed to Evolve

Being involved in building, maintaining and evolving many applications, I came to a
point when I had control over building a brand new Product

As an avid consumer and advocate of Design Patterns for building software in my very
earliest days of professional programming and college (yes I did them in reverse), when
I pitched Design Patterns to my first professional boss, I was awestruck at his response:

> All software approaches a state of entropy over time so I don't see any point in
> Design Patterns

_«jaw drop»_

It was for me at the time a strange off-hand comment used to completely dismiss the
concept.  While I was greatly disappointed and felt my superior was totally out of touch
with what was going in the software development industry, after some time, I had to admit:

> In essence, what he said is correct

Software over time does devolve into entropy, requiring more and more effort to keep it
organized, performant and succinct.  This becomes even more difficult with the rapid pace
of change in the way modern frameworks are designed and adopted as well as the ever
evolving versions of our framework choices which require version upgrades.

There has to be something we can do.

tao.js is designed to build systems to evolve

Utilizing tao.js and the TAO way of building applications heads this off by providing
a universal extension point that is baked into every System and Application built using
it.

Specifically, the TAO provides a way for Apps and Systems to integrate with each other
using the same mechanisms that are used to build the Apps themselves.

Thinking about the very essense of what it takes to build an Application, the TAO is
designed to sit at the core and manage all activity within the App so that every
feature is built with the same basic mechanism for interacting with all of the other
features.

## Build Reactive Systems

It's long held that Reactive Systems (see the [Reactive Manifesto](https://www.reactivemanifesto.org)) have many advantages to building Applications and
Systems.

Getting in the way of easy adoption for building Reactive Systems are:

* Defining the message format
* Describing the protocol for message passing
*

## Write Code designed to run in any execution environment

If we can come to a single paradigm for writing Reactive Systems, we should be able to
translate the mechanism of that paradigm to any execution environment.

The choice to implement the TAO in JavaScript as tao.js is just a first step.  JavaScript
is the obvious choice for it's ability to run in every execution environment, from being
the default browser language to the port of the browser runtime enabling JavaScript to
execute on native mobild devices to the server, serverless and embedded systems (via Node.js).

The TAO is not limited to a JavaScript implementation, with the goal to eventually provide
implementations across other languages, allowing polylingual Systems to be built using
the TAO as a common mechanism and paradigm for constructing Apps.
