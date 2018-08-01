# Origin of `tao.js`

tao.js is the culmination of the pursuit of an idea that has been gnawing at me for a long time.

A decade ago I was stuck with a problem:
> How do I explain to a set of engineers the various aspects of an Application we were in the
> process of architecting in a way that will exhaustively collect all of the necessary requirements
> without missing anything while at the same time not having to define everything myself up front?

We were at a point where the team needed to begin designing not only the individual User Interfaces
for the Application but the overall Architecture and underlying layers of a commercial Application
which would have 2 distinct User Interfaces, a Portal for the majority of users and an
Administrative Interface for various level Admin Users.

After brainstorming with the team the bulk of the needed Domain Model for the Application, in order
to elicit the scope of the effort and identify requirements gaps, I created
a 2-Dimensional Matrix in a spreadsheet listing each _Entity_ down the left side of a spreadsheet,
one for each row, and listed across the top row, each CRUD _Operation_ the Application had to
manage in order to facilitate the data necessary for the Application to do its job.  However,
this matrix wasn't enough to solve my problem.

At this same time after multiple iterations of dealing with Application Performance in several
different contexts, I had also come to a full appreciation of utilizing multiple data stores for an
application depending on the unique needs for particular data in order to keep the application performant
as measured by the User.  For example, utilizing a 4th Normal Form Relational Database in order
to effectively Administrate data versus using denormalized Objects stored in a Caching Store used to
retrieve data for the Client Portal.  Or a Meta-Data-based dynamic model for an OLTP database
that is very flexible for capturing transactional data versus an OLAP Star Schema used for reporting aggregations on that data quickly.  This was prior to the explosion of not only interest
but availability of NoSQL data stores which furthered the cause of having architectures with
heterogenous data stores.

Much earlier than this point, just before matriculating back to USC I became obsessed with using
Patterns in software development after reading the Gang of Four's seminal work
[_Design Patterns: Elements of Reusable Object-Oriented Software_][gof].
A couple of years later, this obession for consuming Pattern books led me to pick up and read
what appears to be a fairly unknown book called [_A Requirements Pattern: Succeeding in the Internet Economy_][reqs_pattern]
in which the author, [Patricia L. Ferdinand][reqs_pattern_author] details
how to ensure capturing all of the requirements needed to build software by using a 3-Dimensional
matrix that includes all of the stakeholder _Perspectives_ on their own axis in order elicit gaps
in requirements.  This created a new fascination for leveraging 3-Dimensional matrices as
constructs to modeling or describing systems.

Back to my architectural requirements problem, realizing a traditional 2-dimensional matrix (Entity x Operation) wasn't enough to capture and communicate everything the team needed, inspired
by the _Perspective_ dimension, and knowing we had _at least_ 2 explicit perspectives to handle from
a UI standpoint (Portal and Admin), I completed the team's planning matrix by adding a 3rd
dimension for the _Perspective_.  And because one of the major values of the Application was
its Reporting capabilities, I included 3 _Perspectives_ (Portal, Admin, Reporting) in the matrix
and communicated to the team that we needed to use the matrix as a guidemap to plan and design
all of aspects of the application and its architecture, it's UI Screens as well as how to deal with the data those will create at the Services, Domain and Data Layers.

By adding this 3rd dimension (Perspective) I was able to effectively communicate the concepts to the team as well as allow them to see where they had gaps they needed to fill in.  In essence, depending on what _Perspective_ a User or Actor is taking when _Interacting_ with the Application,
not only should the Application behave differently, it will store and/or retrieve data from an
entirely different location and/or in a different format.

After I did some work with the 3-Dimensional Requirements Matrix, I wondered if it would be possible to translate this way of defining an
Application into actual code.  This led to the architectural concept of:

> Defining an Application as the _Set_ of Application Contexts that it supports as a Triple
> (3-Dimensional Tuple), where all activity within the Application is a transition from one
> Application Context to another.

If there was a framework that could leverage these definitions to wire up functions (as handlers)
that would react to the AppCons, then it would unlock an architecture completely built on
composition from the start, allowing the system itself to evolve without acruing technical debt.

And, if that same framework allowed for handlers to be defined on _Wildcards_ of any or all of
the 3 Dimensions that make up an AppCon, then we would have the power of injecting _Crosscutting
Aspects_ in between the normal application logic while keeping them separated in the code.

This led me on a quest to discover how to make this happen as well as solve the problems of
the design which led to the eventual creation of tao.js which takes its name from how an
AppCon is defined:

**T**erm - the _thing_ in the context - conceptually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ from which the User or Actor interacting with the system has
during this _operation_ on this _thing_ at this moment

[gof]: https://en.wikipedia.org/wiki/Design_Patterns "Design Patterns: Elements of Reusable Object-Oriented Software"
[reqs_pattern]: https://www.amazon.com/gp/product/0201738260 "A Requirements Pattern: Succeeding in the Internet Economy"
[reqs_pattern_author]: https://www.amazon.com/default/e/B001KHRTF6 "Patricia L. Ferdinand"
