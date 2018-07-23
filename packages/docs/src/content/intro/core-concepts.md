# Core Concepts of tao.js

At the very heart of tao.js is the concept of an Application Context (aka AppCon) described
using 3 Dimensions:

**T**erm - the _thing_ in the context - conceptually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ from which the User or Actor interacting with the system has
during this _operation_ on this _thing_

But before diving too deep into the TAO, there are a few preceding concepts that will help create
a deeper understanding as to why it is defined the way it is before explaining what
this represents or why it's beneficial.

_Seriously, if you want to skip down below to the explanations about
[Application Contexts](#application-contexts-aka-appcons) then be my guest.  However, you **are**
reading a page about the **Core Concepts** so it seems a bit base to skip ahead at this point.
If you don't care about a deep (or any) conceptual understanding of tao.js, I don't blame you,
as it's entirely unnecessary to have in order to either use tao.js or gain the [Benefits](benefits.md)
of using it.  So please, if it suits you, by all means, skip over to the [Basics](../basics)
and/or [Advanced](../advanced) usage guides.  I'm just sayin'…did you read the [Origin](origin.md)
story?_

## Reactive/Evented Application Building

I've been obsessed with the concept of purely reactive application building for a long time now.
At the start of my professional career in development, I was building

The best way to build Reactive Applications is to use an Event-driven architecture like the
[Observer Pattern](https://en.wikipedia.org/wiki/Observer_pattern) that ensures the code you
want to react to changes or messages is decoupled from the code that is generating the
interactions, events, and/or messages.  In this way, listeners (aka reactors) can be added
and removed at any time without any change to the generators.

### Functions, Messages, and Events

Functions are the most basic unit of decoupling and decomposing programs into smaller units.

When learning Object-Oriented Programming (OOP), one of the concepts that stuck in my
head in the literature I read was that calling _Methods_ on an _Object_ is referred to
as "passing _Messages_" to that object.

### Evolution of Events

What makes tao.js and the TAO unique is it's use of 3-Dimensional Event-like Handlers.

#### 1-Dimensional Events

Some frameworks like [Redux.js](https://redux.js.org) or [Socket.io](https://socket.io) provide
a 1-Dimensional form for _Events_ using a single `String` as the name for the event that is
dispatched for various listeners (in Redux it's `reducer`s) which are subscribed to the event
by it's `String` name.  (In the case of Redux, `action`s of a `type` are dispatched and `reducer`s
act as listeners but receive all events and filter to only those for which they want to receive).

In order to overcome this limitation of a single dimension, most implementations end up defining
events using some sort of delimiter in the name to group events around common Terms, e.g.

```javascript
// Definition of Redux.js action types as constants
export const SPACE_VIEW = 'space/VIEW';
export const SPACE_CREATE = 'space/CREATE';
export const SPACE_FIND = 'space/FIND';
```

#### 2-Dimensional Events

JavaScript's DOM and Node.js' event model (via [`EventEmitter`](https://nodejs.org/api/events.html))
implementations are 2-Dimensional like most other implementations of the
[Observer Pattern](https://en.wikipedia.org/wiki/Observer_pattern).  2-Dimensional Events
provide the ability to specify a source Term as well as the event being raised.

In single execution environments (like a browser or a single process) this is
implemented as the Term being the _Source_ of the event and _Observers_ registering
directly with the Term (or Object) _Source_ for specific events, again defined by a
`String` name (in most cases) or by calling a specific registration method defined
for a given event.

In multi-process environments, 2-Dimensional Events are implemented using _Queues_
of _Messages_ as a [Publish-Subscribe (Pub-Sub) Pattern](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern).
The name of the _Queue_ is akin to the Term and a type embedded in the _Message_ is
congruent to the specific Event.

2-Dimensional Events are much improved over 1-Dimensional Events but still have limitations.
In single execution environments, _Observers_ must know how to locate every _Object_ (Term) and
individually subscribe to every event.  In multi-execution environments, each _Subscriber_
must know the location of every _Queue_ or _Topic_ (Term).  An additional limitation of
Pub-Sub pattern is the negotation of the encoding for messages in every individual _Queue_
or _Topic_ that must take place for every _Subscriber_ to know how to decode the _Messages_
as well as to ensure it has what it needs.

#### 3-Dimensional Events

The TAO uses AppCons to define a common 3-Dimensional Event across all execution environments
with the addition of the _Perspective_ (aka Orient(ation)) to provide a more robust ability
to describe what takes place within an application or system of applications.

For example, within a single application, an _Event_ such as `User` `Enter` has several
possible Orient(ation)s in order to exhaustively describe what is necessary for the application,
like: `Portal`, `Admin`, `Tracking` and `Reporting`.  Each of these example Orient(ation)s or
_Perspectives_ transcribes a different set of needs on the `User` Term and `Enter` Action.

This is anlagous (but not congruent or completely the same) to having different Views
in a Relational Database for a single Table.

This 3rd Dimension provides the TAO with the necessary comprehensiveness to describe all
possible events for a given application or system of applications.

#### Why not more Dimensions?

I thought of this early on:
> why not allow Events to be Tuples which can vary in size based on need?

As stated above, the 3rd Dimension provides enough meta-data for which to capture a definition
for all Events in a system that is exhuastive and sufficient.  The addition of more Dimensions
would increase the Complexity of the TAO without adding additional benefit.

An individual AppCon also allows data to be attached to any of the 3 Dimensions of the TAO
to copmletely describe the individual AppCon.  In every case, it is possilble and relevant
to attach what is seen as an added dimension of data to the Orient(ation) for the AppCon.

#### Chained Events become Protocols

## Application Contexts (aka AppCons)

As stated above, an AppCon or Event is defined across these three reference points (or as
written above - dimensions):

**T**erm - the _thing_ in the context - conceptually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ from which the User or Actor interacting with the system has
during this _operation_ on this _thing_

A good analogy for the TAO is that of the grammatical parts to a sentence.

### *T*erms

Terms generally come from the Domain Model of an application or system of applications.  These
are the _things_ we are attempting to model within our application that end up being stored
to a database somehwere or exist purely as a derivation of data within the executing environment.

A Term may also be a _Relationship_ between two or more _Entities_, and the TAO does not care
to distinguish the difference between an _Entity_ and _Relationship_ Term.  In fact, it's
one of the powers of the TAO that _Relationships_ are elevated to a first-class status
as a Term to be reacted to just like an _Entity_ can be.

From our sentence analogy, a Term is the _Object_ in the _Predicate_ on which the AppCon is
occurring as it is transitioned to.

### *A*ctions

Actions are the _Operations_ that are performed on or against a Term.

Actions are defined at a much more granular level than standard CRUD Operations so as to
provide a deeper meta-data model on which to interact and react.

In a traditional application where there is no stated goal to have uniform semantics across
all execution environments, the **C**(reate) of CRUD operations would be implemented using
an Event name like `"CreateNew"`

From our sentence analogy, an Action is the _Verb_ of the sentence.

### *O*rient(ation)s

Orient(ation)s are the _Perspectives_ taken by the _Actor_ that is either interacting or observing
the application or system of applications at the time of the AppCon.

Orient(ation)s allow for an effective way for the system to act or react differently for the
same Action operating on the same Term by describing a unique context.

From our sentence analogy, an Orient(ation) is the Subject or Actor that is acting out the verb
on the object.

## U.S.E.R. Model

Along my journey towards creating tao.js I came to the conclusion that after defining your
domain model, if you use the _Reference Point_ of considering each of your _Entities_ in a
3-Dimensional _Space_, then it becomes very easy to define and describe the Actions a _User_
can take on each model as well as your whole system.

This led me to define the **U**ser **S**patial **E**ntity **R**eference Model (U.S.E.R. Model
for short) as a Tool by which to discover and document [Use Cases](https://en.wikipedia.org/wiki/Use_case)
using AppCons.

The essential outcome of the U.S.E.R. Model is that it defines a set of Actions that _can_ be
applied to all Terms in all Orientations as a _Super Set_ of possible AppCons for your
Application, and eliminates the guess work for how to define Actions for your system,
speeding up the process of defining and building your applications.

The list of Actions defined by the U.S.E.R. Model is:

* New
* Add
* Edit
* Update
* Store
* Retrieve
* Find
* Enter
* View
* etc.

For more about the U.S.E.R. Model, please see my post entitled [Every Use Case Ever Written](https://link.to.blog/i-never-wrote).

## AppCons as a Universal Message Format

Fire and forget.

From an integration perspective - think about the best way to integrate 2 systems.
Thru the use of a message queue

Break that model down into smaller and smaller parts.

## Reacting to AppCons

### Basic Handling

## Aspect-Oriented Programming

### Wildcard Handling

### Advanced Handling - Asynchronous

### Advanced Handling - Intercept
