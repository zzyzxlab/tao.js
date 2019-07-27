# Decoupling Applications from Architecture

Docker led the way by introducing a new dawn by which we
can decouple our Applications and their software dependencies from
the Infrastructure on which we need to run them.

The TAO is here to provide the same by decoupling our Applications
from the Architecture on which we implement them.  A true
separation of the Application (its logic, data and interface) from
where the data is stored, how we move data around and where the
code of the application executes.

The intent behind this split is to allow each to evolve
independently without affecting the other, allowing the context of
the moment (current needs) to guide the changes made to an application
in the direction intended to achieve the most value without
compromising the future of the application.

## A Layered Approach

Docker provided a clean separation between the Application Layer
and the Infrastructure Layer.  This led to vast improvements in
DevOps and System Administration enabling an explosion in the
development of Cloud Native technologies like Kubernetes independent
of the Applications being built to run in the Infrastructure
provided.

The TAO further divides the Application Layer into 2 layers along
the lines of implementation responsibility like Docker does:

* Developer Layer
* Architecture Layer

## Using the TAO to achieve our goal of decoupling

The 3 parts making up the TAO provide the ingredients towards decoupling
these 2 layers from each other:

1. Trigram as message format
2. Handler primitives (intercept, async, inline) as the interaction
3. Signal Network

We can group these into our 2 Layers by who is responsible for
defining and implementing them:

1. Product Managers & Developers
  * define Trigrams
  * define desired Behaviors when Trigrams are triggered
2. Developers
  * implement Behaviors using Handler Primitives w/ desired language
3. Architects
  * decide what Signal Network implementation to use
  * decide where to run the Signal Network

Just like Docker introduced the Container using the shipping
container analogy to separate what is inside the Container
(Application Layer) from what the Container is running on
(Infrastructure Layer), the TAO uses the API of the Signal
Network to separate the Developer Layer from the Architecture
Layer.

_What_ an Application is as defined by using trigrams and _what_
the Application implementation is using handlers is separated from
_how_ the different parts of an Application communicate using the
Signal Network and potentially _where_ the different parts of the
Application execute.

## How does this differ from other Rapid Application Development Frameworks?

### Choice in Architecture

Most Rapid Application Development (RAD) Frameworks are providing the
"Rapid" part of the application development by deciding on the Architecture
for you.

The TAO is not making technology or implementation decisions based
on a prescribed architecture:

* any data store is supported without need for a framework specific library
* how interaction with the data store is through the chosen driver

NO lock in on using specific communication mediums.  All of REST,
GraphQL, gRPC, Websockets, Request-Reply, Publish-Subscribe, etc.
are available when using the TAO.
