# Designing the App as a Platform

Based on these requirements, to offer the desired flexibility in our first roll out as well as
provide future flexibility in the form of Features & Modules, we concluded it makes sense to
create our new build as a Platform rather than a set of individual Applications.

This is where the story begins to diverge from historical events about the project I was a part of
to where I tried to take it that it didn't go, and where I eventually took my own philosophy
around building applications in the future.

## Architecting the New Build

When it came time to design the architecture of our new build of the Media Management product,
there were 3 people involved: our Senior Web Developer, an External Consultant and myself.

Our Senior Web Developer was a full stack Software Engineer with a good amount of experience
building web-based client-server applications.  He was looking to use this opportunity to broaden
his career by not only being the Technical Lead for our flagship product, but to also lead the
internal architectural effort.  Unfortunately, because he didn't have much experience architecting
large software applications, he became very defferential to our External Consultant.  In addition,
he wasn't being given any direct mentorship as someone who had not only not done this before, as
someone who had not had experience leading an effort with an outside consultant before.

The External Consultant had experience at Microsoft and came to us "highly recommended."
However, I was able to size him up fairly quickly.  Giving him the benefit of the doubt early on, I stayed back to observe as the two collaborated on the architectural underpinnings of the new build.



but whenever I pressed him on any of his design
decisions, the answer was always:

> because that's the way it is done

An Architect should always be able to articulate some reason why a choice is made.  Because of his
lame brain answers I took the time to figure out exactly what my view of Software Architecture is
as well as articulate it in a


## Architecting the New Product

In order to meet our [Packaging Requirements](reqs.md#packaging-requirements), we need to rethink
how we not only deliver the product as a Product Line with various configurations, we need to
consider how the product itself is built.  Additionally, to provide the right type of [API Requirements](reqs.md#api-requirements)
that will meet the needs of our VAR Partners, just providing a REST API isn't good enough as
our Partners are looking for ways to embed functionality from other products into our Media
Management products.

By considering our [3-Dimensional Matrix](matrix.md) as a set of not only things our Application
needs to handle, but also as a set of distinct contexts within which a User of our Application
can enter or move through, we can begin to open up the door to more.  By looking past a simple
Client-Server Application and focusing on

It's important that we need to see our application as a Platform instead of just a standalone
Application.  A Platform that has hooks for adding Features and Modules from Integrators and
Module builders.  If we see it in this way then naturally what if we take it further and look
at it as a Platform on which we build our own Features and Modules, acting like Integrators and
Module builders.

Normally, for a product that is a first build and has some uncertainty around customers and market
fit, it would be crazy to consider building it as a platform, unless that is the product itself.
I will demonstrate later that this isn't the case, but in the normal course of building applications, this would be prudent.

However, when we have a proven product, that is several years old and demonstrating value in the market to the point there is high demand, and it is undergoing a rewrite due [Technical Debt](problem.md#tech-debt).  In this case, when the desire is to ultimately provide a platform that
would itself unlock a lot of potential value to not only our company, but to the Integrators we
rely on for the bulk of our sales, then starting the new build as a Platform is a more prudent
option from the start.

## Platform Extension

When desiging a Platform for software, the most important decision up front is what are the points
of extension that will be used by developers to add functionality to the Platform.

Can we build upon our [3-Dimensional Matrix](matrix.md) to become our extensions points?  
I thought you'd never ask.

What's missing from our current Matrix Model?  
Because they can have an important life of their own, separate business logic as well as a level
importance to building Features and Modules, we're not accounting for Relationships between
Entities, such as User-Content, User-Folder or Folder-Content relationships.  A simple fix is to
elevate Relationships to be first-class like an Entity is within our model.

So now our example matrix is something like this:

| Term           | C | R | U | D | Perspective |
|----------------|---|---|---|---|-------------|
| Content        |   |   |   |   | Portal      |
|                |   |   |   |   | Admin       |
|                |   |   |   |   | Report      |
| User           |   |   |   |   | Portal      |
|                |   |   |   |   | Admin       |
|                |   |   |   |   | Report      |
| User-Content   |   |   |   |   | Portal      |
|                |   |   |   |   | Admin       |
|                |   |   |   |   | Report      |
| Folder         |   |   |   |   | Portal      |
|                |   |   |   |   | Admin       |
|                |   |   |   |   | Report      |
| Folder-Content |   |   |   |   | Portal      |
|                |   |   |   |   | Admin       |
|                |   |   |   |   | Report      |
| User-Folder    |   |   |   |   | Portal      |
|                |   |   |   |   | Admin       |
|                |   |   |   |   | Report      |
| …              |   |   |   |   | …           |

Now we are covering anything that our data store would need to keep track of and surfacing it to
our design via the Matrix Model.

Our _Perspective_ s capture how we may store the data in different ways depending upon how
it will be used, e.g. a very normalized version in our Admin database vs a denormalized version in
our Portal's data store designed for handling high read throughput.  Our Perspective also provides
a bit more:

1. we can split up our Modules to only listen for the Perspective they care about
2. we can split up the logic used to manipulate the data between Perspectives

An example of #2 from above would be that when a piece of `Content` is `Created` via the `Admin`,
its denormalized version will need to be `Created` in the `Portal` database.  If our `Content`
Module can have some sort of trigger when this occurs to execute the `Portal` logic after the
`Admin` logic succeeds without the `Admin` logic being aware of it, then we've successfully
decoupled the two through a useful extension point.

Thus, we now have an extension point mechanism we can use throughout the Platform.

## Extending Functionality through Features

Now that we have a successful model of our Extension Points for the Platform, how do we want to go
about adding Features to the Platform?  Like, how would a developer add a Feature or Module to the
Platorm itself?

Is it possible to use our Extension Point model for this, too?

What if we used `Feature` itself as a Term?

Individual Features can be created, read (used), updated (upgraded), and deleted (removed) from
the Platform just like any other Entity.  **And** as a Platform, it would need to keep track of
these in the same way in order to surface them correctly.

Additionally, the relationship between `Feature`s and other Entities would be important in
determining:

* which Users can access a Feature?
* which Content does a Feature apply to?

So if our Extension Point mechanism is also the same mechanism by which a Feature is added,
loaded, and manipulated within the Platform, then we're truly on our way to a nice design.

## Moving Beyond CRUD

Next we'll see how moving beyond basic CRUD operations will allow us to understand our
applications built using the Platform as a series of [Application Contexts](appcons.md).
