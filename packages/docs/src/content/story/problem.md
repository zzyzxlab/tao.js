# The Problem

Let's imagine you've joined our company.  This company started out building creation tools
centered around video content. Over time and at the behest of customers, they built an
application that allowed for the management of the content created by the authoring tools,
which included:

* a Portal for easy consumption and tracking of viewership
* an Admin for managing the content and users within the system
* and a set of Reports mostly tied to the Admin itself

It was a pretty standard story of building it specifically for a large client based on their
specific requirements and then marshalling it into a more generalized application so it could be
sold and resold to many other clients.

This is about when you joined the company, but after about a year and a half, the product needed
an overhaul to remain competitive, especially for the money being charged.

## Technical Debt

The product itself had plenty of technical debt stemming from multiple factors:

### Outdated Technology

Starting with outdated technology when it was first built because that's what the first developer
knew how to use, the technology in the existing version is at best 5 years old now at this point.

This gives us several issues:

* reuse within the application is harder, and reuse with other products is impossible
* having to hire developers to work on old technology
* maintaining the code base requires specialized expertise that is not being taught or learned

### Technical Decisions

Stop me if you've heard this one before, but the original application that was built for our
large customer was built by a single developer under a strict deadline with direct
guidance from an eccentric customer.  The developer with a background in small business website consulting
was also equally as eccentric, and this was the most complex project he'd ever taken on.  Lacking
the experience of working with others on a code base nor having to maintain his own work for any serious duration, this
project became a playground for testing new patterns he would come up with on the spot.

_Side note: this is not a knock on the developer who did the work.  He built what he thought best
at the time of building under the guidance and oversight of those in charge.  I bring it up in
this way because I've seen this pattern of behavior in start ups so often and it's useful to
understand how we got to where we are to illustrate the point for this story.  In the end, if a product is built and makes money and allows
the start up to grow, then it's done it's job.  With my experience and the lessons coming, I'm
going to show a better way to get there._

Lacking a cohesive set of patterns for developing the application, when it came time to repurpose
it for general use, much of the functionality was bespoke for the initial client and coupled to
the client's specific desired workflow so it couldn't be ported over.  Unfortunately, instead the
design patterns used were ported over for the sake of "expediency."  It's funny how often
expediency is used as an excuse to save a week or two for software that will be either sold to
other people or in execution for years to come.  When other developers picked up work on the
application, they could only copy the patterns already in place in order to "make it work."

These early technical decisions are so prevalent in the product that they made it almost
impossible to refactor anything because everything represented a "large change."  One good
example is how navigation and the menu system work.  This was _most visible_ to our
customers where one of the top-level menu items called "Management" has 70% of the functionality
in the Admin UI, leaving a very unbalanced information architecture that we receive a lot of
complaints about.

This first developer of the application is no longer with the company, having only overlapped your
time by only one month.

### Frankenstein Technology

I'm sure you've experienced this hack before.
In order to build new reports for an SOW with a bell cow customer in the Pharmaceutical industry
that would be used to provide recommendations to future customers, we even stood up a new server
to use newer technology and embed it within an iframe to make it seem like part of the
application.  While it allowed the reports to be easier to build, it messed with the navigation,
further complicating the UX for customers.

### Different Customers

The original solution was built with an Enterprise Customer wishing to serve thousands for live
or pre-taped events across the company's global network and requiring that it be self-hosted
inside their network.  While this is still a large portion of the target customers having deep
pockets, we started selling to other types of customers with different usage scenarios:

* Universities for online replay of lectures and course materials
* Universities and Schools offering Compliance education
* Large Government organizations with strict regulation constraints
* Health Providers with strict HIPAA regulation requirements

### Upgrading

The existing Media Management application has a difficult upgrade path, requiring downtime
whenever there is a change to the database and strict reliance on outdated DLLs on the server.

## Moving Forward

Based on these factors, it is definitely time to go with a rebuild using latest technologies,
current well-known design patterns, and allow the current team to own the codebase.

As someone who has spent time maintaining and adding new features to the existing application,
you realize what is best for the new build is to not try to build everything into a single
monolith up front but to split it up into 3 distinct applications depending on how it will be
used:

* Portal interface for consumers of the content
* Administrative interface for content creators and organizers
* Reporting interface for report consumers

The team agrees with your assessment and it is decided to build 3 separate applications to handle
these 3 general uses rather than attempt to build them all into a single application.

Which lead us to defining our [Requirements](reqs.md).
