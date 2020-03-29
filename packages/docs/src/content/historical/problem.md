# The Problem

Years ago, I worked with a company that started out building creation tools centered around video content. Over time
and at the behest of customers we built an application that allowed for the management of content.
It was a pretty standard story of building it specifically for a large client based on their
specific requirements and then marshalling it into a more generalized application so it could be
sold and resold to many other clients.  I came to the company after the initial large client
version was built, and during the time when there was a new version intended to be less bespoke
for that client but really needed work and planning to be a true product deliverable to clients
at scale.

After about a year and a half, the product needed an overhaul to remain competitive, especially
for the money we charged.

## Technical Debt

The product itself had plenty of technical debt stemming from multiple factors:

### Outdated Technology

Originally built in ASP 3.0 and VBScript with a single MS SQL Server database, and at this very
time version 3.5 of the .NET Framework was readying for release, the technology was at best 5
years behind.

This gave us several issues:

* reuse within the application was harder, and reuse with other products was impossible
* having to hire developers to work on old technology
* maintaining the code base required specialized expertise that was not being taught or learned

### Technical Decisions

Stop me if you've heard this one before, but the original application that was built for our
large customer was built by a single developer under a strict deadline with direct
guidance from an eccentric customer.  That developer with a background in small business website consulting
was also equally as eccentric, and this was the most complex project he'd ever taken on.  Lacking
the experience of working with others on a code base nor having to maintain his own work for any duration, this
project became a playground for testing new patterns he would come up with on the spot.

_Side note: this is not a knock on the developer who did the work.  He built what he thought best
at the time of building under the guidance and oversight of those in charge.  I bring it up in
this way because I've seen this pattern of behavior in start ups so often and it's useful to
understand how we got to where we are to illustrate the point for this story.  In the end, if a product is built and makes money and allows
the start up to grow, then it's done it's job.  With my experience and the lessons coming, I'm
going to show a better way to get there._

Lacking a cohesive set of patterns for developing the application, when it came time to repurpose the
application for general use, much of the functionality was bespoke for the initial client and coupled to his workflow so it couldn't be ported over.  Instead, the
design patterns used were for the sake of "expediency."  It's funny how often expediency is used as an excuse to save a week or two for software that will be either sold to other people or in execution for years to come.  When other developers picked up work on the application, they could only
copy the patterns already in place in order to "make it work."

These early technical decisions were so prevalent in the product that they made it almost
impossible to refactor anything because everything represented a "large change."  One good example was how navigation and the menu system worked.  This was _most visible_ to our
customers where one of the top-level menu items called "Management" had 70% of the functionality in the Admin UI, leaving
a very unbalanced information architecture that we received a lot of complaints about.

In order to build new reports for a bell cow customer, we even stood up a new server to run
ASP.NET with C# and embedded it within an iframe.

### Different Customers

The original solution was built with an Enterprise Customer wishing to serve thousands for live
or pre-taped events across the company's global network.  While this is still a large portion of
the target customer, we started selling to other types of customers with different usage scenarios:

* Universities for online replay of lectures and course materials
* Universities and Schools offering Compliance education
* Large Government organizations with strict regulations
* Health Providers with strict HIPAA regulations

### Upgrading

The existing Media Management application had a difficult upgrade path.

## Moving Forward

Based on these factors, it was definitely time to go with a rebuild using latest technologies,
current well-known design patterns, and allow the current team to own the codebase.

As members of the Microsoft Partner Network using a MSDN-based development stack and
selling to predominantly enterprise customers, we settled on using Microsoft technologies to build
the new application.  Or rather, set of applications.  You see, the product itself had several
different components to it:

* Portal interface for consumers of the content
* Administrative interface for content creators and organizers
* Reporting interface for report consumers

It was decided to build 3 separate applications to handle these 3 general uses rather than attempt
to build them all into a single application.

Which led us to defining our [Requirements](reqs.md).
