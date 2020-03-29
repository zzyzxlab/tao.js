# Apps are Data

At this point in my career, I had 7 years of developing various applications under my belt from
scratch and having to architect them for other people.

In that time, I had dealt with the trials and tribulations at a granular level of having to
store data in a normalized way to make it easy to manage while also report on it with relatively
low latencies to provide a good user experience.

## Data Model Fail

I had the special privilege of painting myself into a terrible corner of my own design by
choosing to build a large-scale application data model using a meta-model data schema design.  A meta-model
data model relies on the data itself to define the relationships within a meta-structure as the schema
only provides a restriction on what relationships could be.  Normal normalized models rely
on the structure of the schema to define strict relationships between entities.

While the meta-model made
sense to me to organize the data from various different sources (every "customer" of Countrywide
Financial Corporation) when a customer could be a loan applicant, a loan sales agent, an
individual loan broker, or a commercial bank.  And it was desired to report on survey data from any of them with
relation to all of the others.  These were all organized in their own way in their own
hierarchies and stored in their own disparate data stores.  Getting the data in was relatively
easy using this meta-model approach, but retrieving it became very hard.

Retrieving data from a meta-model schema database relies on complex join operations to pull the
data out in a meaningful way.  Unfortunately I didn't try to pull the data until after building the whole model and inserting
large amounts of the data (another lesson learned about incremental delivery).

By the way, when someone tells you they work 100 hour work weeks, please feel free to call
bullshit.  During this time I actually worked a 105 hour 5-day week as tracked by our time
tracking system, and I barely had enough time to take various 20 minute naps throughout the day,
make my commute home at 2:00 am, sleep for 2 hours, take a shower and commute back to work by
6:00 am to avoid traffic.  It was an impossible pace to keep up without the use of narcotics
(which I didn't) and one where the body eventually decides it's had enough and you sleep.

## Perspectives on Data

Why the long story about a failed database design?  Because it was through these failures that I
learned important lessons about how we treat our data.  While I understood early on, that every
application is a set of Data and the combined set of manipulations on that data, I was married to
the idea of getting the "source of truth" correct for the data.  It turns out the Application is the source of
truth for the data, and the Application may require various perspectives on that data.

We use OLTP databases to keep track of our transactional data, and OLAP databases to report on our
data.  It's the same data but with different perpspectives applied.

At the time of this project, the NoSQL movement was beginning to take hold.  I began to understand
that not only did it make sense to have different databases for transactions and reporting,
depending on the need, our application might have several different perspectives on the same data,
and store them differently in order to provide the best user and developer experience.

We normalize data for managing it.  We cache denormalized versions of our data for quick reads in
order to consume it.
We denormalize and track the same data as it changes into Star and Snowflake schemas to make ad-hoc reporting fast and accurate in time.  All of this is ok,
and it's expected if you're doing it right.

The most valuable lesson from the NoSQL movement
is that we should expect to have various different data stores that will model the data specifically
for the given use (or perspective) which is most advantaged.  There is room in many applications
that have enough sophistication and age for a Relational Database, a Document Store, a Key-Value
Store, and possibly a Graph Database.  We rarely perform search against our Relational Database
anymore, offloading that to Elasticsearch.

## Effect on the Project

Recognition and acceptance of a multi-store data model is an important breakthrough in our
thinking, although my team hadn't come to that conclusion yet.

The evolution of that conversation came during our conversations about [Building a Matrix](matrix.md)
to capture the breadth of requirements and solution designs.

## Not used

Every application is simply a set of

When designing applications, it had always occurred to me that an App is simply a set of Data
and the various manipulations of that Data.  In other words:

> Apps are Data

The manipulations we allow on that Data comprise the logic of the application usually represented
by our old friend **CRUD** for:

* Create
* Read
* Update
* Delete

Having the
