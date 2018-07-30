# Motivations for & Goals of tao.js

So why do we need tao.js?  Don't we have libraries and frameworks that do this already?

There are several motivations behind creating tao.js that originate from a need to
describe software effectively for technical members (developers, QA, etc.) and non-technical
members (product managers, designers, etc.) of teams alike.

This original need _led to_ the creation of the TAO and implemented in tao.js as a way to
_build applications and systems_ which then presented an opportunity to achieve the original inspired intent of communicating a description of software through a simple grammar.

## Brief Origin Story

Very briefly, what initially started by using a 3-Dimensional Matrix to describe the needs
of an Application Platform turned into a way to model an Application.  When combined with
some other architectural models, this new model or _way_, aka the TAO, then materialized
into a core architecture for writing Applications.

### Short Systems Engineering Theory of the TAO

With the realization that the TAO could be used to actually build the software it was being
used to describe, it became apparent there was a lot of value in using a system that could
be used to build software which had its design roots stemming from defining the software in
the abstract or non-technical way.

Breaking down the concept of Software Architecture to its basist core, it can be defined as:

> the set of answers to the questions posed by a Software Engineer when it comes time to
> implement a feature of an Application or System

Using the TAO as an architecture thus means it's providing these answers when it comes time
to build an Application and add features to it.

This system, to be effective, should be ubiquitous and able to be leveraged to write
all code required to implement the desired Application or System.  The ubiquity of JavaScript
and its unique ability to run in any execution stack (specifically in clients and servers)
made it the obvious choice for an initial implementation to both prove the theory of the
system and its benefits.  Additionally, the choice of JavaScript allows leveraging the
existing ecosystem to get enough people to try it to validate the proof.

Hence the birth of tao.js.  However, to be truly ubiquitous and provide the most value,
we would eventually like to port the TAO to other languages and frameworks, and will
graciously accept help in that regard.

## Motivations

The origin and theory behind the TAO led to a set of 4 distinct motivations, each with their
own set of goals:

1. [Build Apps in a Way that allows them to Evolve effectively](#evolve-apps)
1. [Make it Easy to build Apps with good Architectural Foundations](#easy-architecture)
1. [Codify Software Product Descriptions](#codify-product)
1. [Empower Developers with Flexibility of Technology Choices](#empower-choice)

We'll step through each motivation here.

### 1. Build Apps in a Way that allows them to Evolve effectively {#evolve-apps}

> It's the desire of all code to become legacy
>
> \- Wise Old Developer

As developers and product managers, we want to build Applications that have a chance to evolve
over time.

Primary to the TAO is a desire to build Applications in a highly Iterative fashion so that
a core value is easy to create, and the App can evolve effectively in any direction as necessary
without the unnecessary introduction of technical debt.

This comes with 2 Primary Goals:

1. Applications are **always** composable and decoupled
1. Build Apps like Building on a Platform
  2. Use a mechanism built-in for Extension Points that can expand over time
  2. Any App built with the TAO can be injected with New Features during execution
  2. Features unknown at the beginning of the life of an App are added the same as the First
    Feature

### 2. Make it Easy to build Apps with good Architectural Foundations {#easy-architecture}

After many decades of building software, our industry has devised different architectural
patterns that are effective at decoupling implementations while providing scalability and
performance.  The [Reactive Manifesto](https://www.reactivemanifesto.org) describes the
goals of such an architecture with a prescription for _Reactive Systems_.

Unfortunately, most projects don't begin by utilizing this architectural pattern because the
overhaed of effort required to get started doesn't outweigh the immediate need to
show some value to the customer to prove the need for the existence of the App.  And thus
begins the never ending cycle of prototypes that become MVPs that morph into businesses
that then require some eventual rewrite in order to scale the business.

Using the TAO, we want it to be easy to begin building Reactive Systems from the start _without
additional overhead_.  By achieving this we can avoid entirely or greatly reduce the
introduction of technical debt without the added cost of time.

This creates several Goals for the TAO:

1. Simplified Adoption of Reactive Message-driven Apps
1. Business Logic code that can be executed anywhere in the System
  * No distinction within the code that it executes on client, server, embedded, or in a
    data pipeline
1. Program by Contract with a Dynamic Interface Definition Language (IDL)
1. Apps have Integration built-in
1. System-wide Aspect-Oriented Programming (AOP)
1. The Last Architecture you have to adopt with confidence

### 3. Codify Software Product Descriptions {#codify-product}

The TAO was born out of a way to describe Software Requirements to Engineers that ensures
all aspects of the desired system were taken into account when designing the User and
System Interfaces.

The most common source of poorly made Apps and development that takes longer than planned
or expected is the ineffective description of the desired outcome in the form of Software
Requirements.

We want the TAO to be a primary tool used for describing software as a Simplified
Grammar to Codify the description of the desired Application in order to:

* make Product Managers better by:
  * giving them a device that is easy to learn
  * getting them closer to the code elements of an App
  * identify gaps in requirements before planning or implementation
  * reduce the verbosity required by BDD
* make Engineering Teams better by:
  * be on the same page with Product Managers
  * giving them a device to elicit requirements effectively
  * communicating implementation decisions better

This leads to several Goals:

1. Engineers, QA & Product Managers have a Shared Grammar making it easy to:
  2. Have access to all aspects of a feature in planning before execution
  2. Effectively discuss and debate implementation details during planning
1. Provide a Meta-language for Product Description that embeds itself into the code
1. Product Managers can create Artifacts that generate starting point boilerplate code
1. Self-documenting code

### 4. Empower Developers with Flexibility of Technology Choices {#empower-choice}

Finally, there are a lot of frameworks in the eco-system that are designed to make
Rapid Application Development (RAD) easy to adopt.  Generally these frameworks provide
tooling support to add and make changes.  But these frameworks have several
flaws:

* Locked into rigid development paradigms
* Not built as Reactive Systems
* Dumbing down of data store technologies to the lowest common denominator making the specific
  choice indistinguishable from the others
* Difficulty to upgrade and support major versions
* Variance in the mechanism for extension points amongst frameworks tying the implementation
  code to the framework

The TAO provides a frameworkless framework approach.  The TAO's programming paradigm could
itself be considered a framework, but motivation behind the TAO is to support and encourage
the ability for developers to choose any technology or other framework they desire to
implement their Apps while gaining all of the benefits of using the TAO.

The Goals that come from this motivation are:

1. A Framework that doesn't lock Developers into Technology Choices
1. Provide powerful tooling to support and speed development
1. Framework that encourages choosing the _right tool for the job_ by enhancing the
  distinctions between technology choices
1. Fully Configurable or Configuration by Convention, the choice is up to the Developer

## Full Goal Matrix

|||Goal|
|---|---|---|
|1.<td colspan="2"><strong>Motivation:</strong> <a href="#evolve-apps">Build Apps in a Way that allows them to Evolve effectively</a></td>
||1.|Applications are **always** composable and decoupled|
||2.|Build Apps like Building on a Platform|
|2.<td colspan="2"><strong>Motivation:</strong> <a href="#easy-architecture">Make it Easy to build Apps with good Architectural Foundations</a></td>
||1.|Simplified Adoption of Reactive Message-driven Apps|
||2.|Business Logic code that can be executed anywhere in the System|
||3.|Program by Contract with a Dynamic Interface Definition Language (IDL)|
||4.|Apps have Integration built-in|
||5.|System-wide Aspect-Oriented Programming (AOP)|
||6.|The Last Architecture you have to adopt with confidence|
|3.<td colspan="2"><strong>Motivation:</strong> <a href="#codify-product">Codify Software Product Descriptions</a></td>
||1.|Engineers, QA & Product Managers have a Shared Grammar|
||2.|Provide a Meta-language for Product Description that embeds itself into the code|
||3.|Product Managers can create Artifacts that generate starting point boilerplate code|
||4.|Self-documenting code|
|4.<td colspan="2"><strong>Motivation:</strong> <a href="#empower-choice">Empower Developers with Flexibility of Technology Choices</a></td>
||1.|A Framework that doesn't lock Developers into Technology Choices|
||2.|Provide powerful tooling to support and speed development|
||3.|Framework that encourages choosing the _right tool for the job_|
||4.|Support Fully Configurable and Configuration by Convention|
