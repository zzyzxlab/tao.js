# Proposal Drafts for presentations

## Stop Abstraction Layers

I need to abstract the REST API from my web app…WTF!

## Talk Proposal 1

**Name:** Jeff Hoffer

**Title One:** A new _Way_ to Align Programming Paradigms across Client & Server(less) with tao.js

**Title Two:** Aligning the programming paradigm between Client & Server(less) with tao.js

**Description:**

We currently classify Front End Programming distinct from Back End Programming because they both
are implemented using differing Paradigms to achieve their goals.

Using a tiny library called `tao.js` across both execution environments creates a Unified Paradigm
across all execution environments centered around building Reactive Applications ([Reactive Manifesto](https://www.reactivemanifesto.org))
that enforce Functional Programming and allow Universal Composability throughout your entire
System of Applications.

I will demonstrate how embracing this _Way_ of programming provides the following benefits:

## Talk Proposal 2

**Name:** Jeff Hoffer

**Title:** A new _Way_ to build Reactive Systems and Align Code across Clients & Servers with tao.js

**Title Two:** Embrace the _Way_: build Reactive Systems and Align code across Clients & Servers using tao.js

**Description:**

The [Reactive Manifesto](https://www.reactivemanifesto.org) was written in 2013, and yet it hasn't been
fully embraced by the JS Community.  At the same time, we classify Front End Programming separately from
Back End Programming because they both rely on differing programming paradigms.

After spending 20 years designing, building, maintaining and evolving application systems, I can now
use a tiny library called `tao.js` to unify programming paradigms across Client, Server & Serverless
while gaining many additional benefits to all 4 of those activities.

`tao.js` provides a super-powered Event-based reactive programming model using a 3-dimensional
view of Events [as **T**erm **A**ction **O**rient(ation)] with the following benefits:

## Talk Proposal 3

**Name:** Jeff Hoffer

**Title:** Using `tao.js` to change the _Way_ we describe and build applications

**Description:**

Traditional ways of describing software have limitations:

* Use Cases are 2-dimensional - `Order Food`
* User Stories have no direct translation to code
* BDD is extremely verbose
* Basic CRUD Operations aren't rich enough to capture business logic coordination

`tao.js` (derived from **T**erm **A**ction **O**rient(ation)) uses a 3-dimensional
event-driven model to overcome these limitations and translate the application description
directly to code.

~~Traditional ways of describing applications limit themselves to a 2-dimensional reference like
User.goesToTheBathroom.  `tao.js` [derived from **T**erm **A**ction **O**rient(ation)] uses a
3-dimensional event-driven model~~

In this talk I'll show you how to use `tao.js` to:

1. Collaboratively & rapidly describe the software you're going to build with Product members of your team
1. Translate those descriptions directly into code
1. Build your entire system to be composable and decoupled from day `0`
1. Use the best tool for the job, not be locked into any particular framework
1. Build Reactive applications ([Reactive Manifesto](https://www.reactivemanifesto.org)) that have common
  semantics across all execution stacks (clients, servers & serverless) so code lives anywhere and everywhere
1. Get Aspect-Oriented Programming (AOP) (aka cross-cutting) for free

You can find the [project docs at zyzzyxlab.github.io/tao.js](https://zyzzyxlab.github.io/tao.js)

## Talk Proposal 4

Title: A new Way to communicate and build applications using `tao.js`

Description:
Almost a decade ago I was stuck with a problem:
> how do I explain to a set of engineers the various aspects of an Application we were building
> while being exhaustive in not missing anything but at the same time not having to define everything
> myself up front?

That's when I realized a traditional 2-dimensional matrix (Entity x Function) wasn't enough to capture all of the requirements.
By adding a 3rd dimension (Perspective) I was able to effectively communicate the concepts to the team as well as allow
them to see where they had gaps they needed to fill in.

Once I realized what I had, I wondered if it would be possible to translate this way of defining an Application into
actual code.  Thus is born `tao.js` - a frameworkless library used to build applications designed to be composable and
evolve.  However `tao.js` isn't just a philosophical name for a library but a pnuemonic to remember on how things are defined:

**T**erm
**A**ction
**O**rient(ation)

---

## JSConf US 2019

**Name:** Jeff Hoffer

**Title:** Decoupling Applications from Architectures

Software is the most malleable building material we've ever created, and yet Technical Debt continues to plague the choices we make when building applications.

When we talk about starting new projects, there's always a debate over getting something out the door knowing we're taking on Technical Debt in order to "move faster" versus taking our time to build it properly and risk overengineering and possibly overfitting our application to an unknown problem.  Can we avoid this Kobayashi Maru?

Like what Docker did to decouple the Infrastructure Layer from the Application Layer, we can decouple the Business Application from its Technical Architecture.

From 20 years of experience building software applications for different domains, I'll use many
code samples and example applications to show how we can change the technical architectural
choices of without affecting the business logic, and prove it's possible to decouple the
application from the architecture so we can be fast and build it right.

---

## DeveloperWeek Austin 2019

Title: Decoupling Architecture from Application

Description:
Like what Docker and containers did to decouple the infrastructure layer from the application layer, using code samples and real applications, we'll walk through how we can decouple our Architectural choices from our Application in order to greatly reduce the technical debt incurred by building fast while also creating flexibility to change technology decisions easily.

Session Format: Other
Track: JavaScript
Language: English

---

## CascadiaJS 2019

Video Script:

My name is Jeff Hoffer and I've been building software for 20 years, and from the very beginning I've had a passionate focus on how to properly architect applications and systems.

Software is the most malleable thing we've ever created for building, and yet Technical Debt continues to plague the choices we make when building applications.

I want to talk about how we can build Antifragile Applications and Systems that get better with change to handle this problem.
Codebases are Fragile while Products are Antifragile, always changing to meet the demand of the customer.  It's time our codebase can model this aspect in the products its implementing.

When we talk about starting new projects, there's always a debate over getting something out the door knowing we're taking on Technical Debt in order to "move faster" or taking our time to build it properly and risk overengineering and possibly overfitting our application to an unknown problem.  Can we avoid this Kobayashi Maru?

Like what Docker did to decouple the Infrastructure Layer from the Application Layer, we can decouple the Business Application from its Technical Architecture.

After many runs through various startup companies, I've been obsessing over this problem for a decade now and having come up with a solution I want to share with everyone.

By starting from the recognition that all software implementations are a set of functions that manipulate state, through that lens then every Pattern, Design or Architectural discussion is about how we intend to couple or arrange the function calls and what the Serialization/Deserialization boundaries are for messages and state.

I will describe the problem using specific causes of Technical Debt, and with code samples, experience with existing example applications and a bit of levity to show how we can build upon past achievements in software design to deliver solutions that can evolve easily with the demands of the product.

Additionally, I will show how we can improve the communication with our Product Teams to reduce upstream causes of Technical Debt as well.

__Not Used__

I will describe the problem through the various causes of Technical Debt, and show examples of how these can be solved.

I will also touch on how we can move beyond engineering problems to coordinate

I will describe the problem through the causes of Technical Debt, and use code samples, example applications and a bit of levity to show how we can embrace the entropy inherent in living applications and deliver software that gets better and stronger with welcomed change.

I want to show with code samples, example applications and a little bit of levity how we can decouple our Applications from the Architectural choices and be able to use the best technology for the job in an ever changing application environment.

I'm going to show code samples and example applications that are able to achieve this lofty goal

I want to talk about the prevailing issue when it comes to architecting applications,

Passionate about properly architecting applications

---

### Needed for Talk Proposals

Image: ![Avatar](https://en.gravatar.com/userimage/12727498/76ea2d8177e4f21d4dc5437a0b7478e5.jpg?size=300)

I agree to release any and all audio and video recording and broadcast rights to JSConf for publication
