# Apps are Data

At this point in your career, you're not new to building applications from scratch nor
architecting full applications for others.

In that time, you have dealt with the trials and tribulations at a granular level of having to
store data in a normalized way to make it easy to manage while also serve it up to users quickly
and report on it with relatively low latencies to provide a good user experience.

## Data Model Fail

We've all experienced a time when our primary data model failed.

### Reporting Fail

In the life of an application that has any success, the one thing that is neglected at the
beginning is always reporting.  The

> we'll figure it out later … let's just prove someone wants this first

usually drives that decision.  Then later comes and the business is asking;

> what's going on with our application?  
> how can I tell how successful we are?

Unfortunately, that second question is never phrased that way.  It's usually asked of the team
in a way that it's not even clear that's the goal behind the question, or the question behind the
5 questions it took to get them to the question they finally asked, such as:

> how many pieces of content have been uploaded in the last month by user, and what is the
> viewership of each video broken down by how long each user watched the video?

The first attempt of most teams is to try aggregating that data on the fly to build the
report.  With any normalized data set, this would be a mistake, leading to a report page that
would take minutes to complete if it completed at all.

This works when the data set is small, but systems reach a tipping point at which they fall over.

### Page Load Fail

Another failure of our pristinely normalized data model that comes along often is when there are
too many joins to render a popular page.  This happens with any B2C product that hits a popularity
curve and traffic explodes.

Our normalized model is failing to service the most used aspect of our application, that
used by the consumers of the application in order to easier to manage the data in the back end.

## Solving Data Model Problems

### Denormalizing the Model for Reporting

The next step teams take is to break out of the normalized model to fix reporting by introducing
a denormalized
model into their primary database.  In order to populate those tables that are used to drive
reports, batch jobs are created to aggregate the data at set intervals controlled by cron job
operators.

These work for a time, until they don't or they become too many to manage effectively.

Next comes the request to have real-time counts on active viewers of videos at any given moment
with knowing which video they're watching, how far into the video they are, and all the metadata
surrounding the user and the video so that it can be "sliced and diced" (that is a massively
overplayed idiom) when someone is viewing the report.  At that point we know our batch cron jobs
to denormalized SQL tables inside of our primary database will no longer hold up.  Or we witness
this fact when we try to build it that way.

In fact, this is one of the things that led to the explosion of NoSQL databases at the midpoint
of the first decade of the 21st century when technology companies reached Internet-scale rather
quickly, experiencing growth curves in their data sets that had not been previously seen.

### Multi-Model Approach for Page Loads

The general way we solve this is by using a Cache.  Using a Page Cache like Varnish is one
solution that stands between our server and the client.  However, with the advent of SPAs and
API-driven applications, most often we use some sort of Object Cache in the form of a Key-Value
store like memcache or Redis to store our denormalized and hydrated objects accessible with a
specific key, usually the identity of the primary entity in the database.

This works well for the most part but has some drawbacks.  If we have different pages that utilize
different parts of our fully hydrated entities, then we either store a lot of objects specifically
designed for each page or we cache a god-object with everything every page needs.

## Perspectives on Data

Why the discussion about failed database design?  Because it is through these failures that we
learned important lessons about how we treat our data.  While I was able to understand early on
that every
application is a set of Data and the combined set of manipulations on that data, I was married to
the idea of getting the "source of truth" correct for the data.  It turns out the Application is the source of
truth for the data, and the Application may require various perspectives on that data.

We use OLTP databases to keep track of our transactional data, and OLAP databases to report on our
data.  It's the same data but with different perpspectives applied.

At the time I went through this process, the NoSQL movement was beginning to take hold.  I began to understand
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
Store, Time Series and possibly a Graph Database.  We rarely perform search against our Relational Database anymore, offloading that to Elasticsearch.

## Effect on the Project

Recognition and acceptance of a multi-store data model is an important breakthrough in our
thinking, although your team hasn't come to that conclusion yet.

The evolution of that conversation will come during your conversations about [Building a Matrix](matrix.md)
to capture the breadth of requirements and solution designs.
