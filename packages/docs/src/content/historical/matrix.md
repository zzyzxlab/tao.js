# Building a Matrix

My team was well aware of the [Feature Requirements](reqs.md#feature-requirements) and
somewhat aware of the [API Requirements](reqs.md#api-requirements) as well as the direction to
build separate applications for the major usage scenarios.  The [Packaging Requirements](reqs.md#packaging-requirements)
didn't come to materialize as I wasn't able to get the buy-in necessary for that type of thinking
from the executive management of the project, although it did still pervade how I thought about
the effort.

## Team Struggles

My team struggled to figure out how to design the User Interfaces for the new build of the
Media Management applications.  They came to me with questions:

* What screens should they design?
* How will they know what to create?
* How do we know what to design?

## Patterns

Interlude, just before making my way back into USC to complete a BS in Computer Science, I was working as a
Java Developer for an Internet start up back [in the year 2000](https://youtu.be/kmzpdd4pWvM?t=51).  I was tasked with building a server that could
take customer applications for auto loans and submit them to multiple different providers that
had web services allowing electronic auto loan submissions for used car loans.  Fairly new to
professional software development, my team recently lost our only other developer in the CTO who was fired when the CEO
found out he was running a complete mirror of our site as a competitor.  His replacement was a
friend of the CEO brought in to just keep the lights on so to speak, so I didn't have much
guidance in the way of building software like this.  Like a good overthinking and overanalyzing
junior developer, I came up with 4 different designs for the server.  Without anywhere to turn
for advice on how to tell what is a good design, I reached out to my friend Google with:

> how can I determine a good software design

or some such phrase.  Up kept coming links to the [GoF Design Patterns](https://en.wikipedia.org/wiki/Design_Patterns)
book.  I decided I should probably read it and bought it on Amazon.  This led me on a journey
towards consuming every "patterns" book or material I could find for the next 5 years, and it was the perfect time for it.  Early 2000 saw an explosion of "patterns" material in software development, especially in the Java community.  When I went back to USC, I was popularizing patterns with my classmates and professors, and using many of the patterns I learned during my course work there.

So when I saw another "patterns" book at the USC Bookstore just before graduating, I
snatched it up as another must read.  It's a little known book (only 7 reviews on Amazon) called
[A Requirements Pattern](https://www.amazon.com/Requirements-Pattern-Succeeding-Internet-Economy/dp/0201738260/)
by Patricia Ferdinand.  I read it while I was still at Countrywide several years before our Media
Management new build effort.

In her book, Patricia laid out a 3-dimensional matrix for gathering requirements for software.
The purpose of this is to include all perspectives in order to eliminate gaps that can occur
when gathering requirements.

Here's the visual representation of her method that always sticks out in my head, especially at
the time we were doing this (forgive me but I can't find a digital copy of the book):

![from _A Requirements Pattern_](../story/reqs_pattern_book.png)

## 3-Dimensions

Perspective again!  Perspective is so important for so many things.

Another perspective I was working from at the time was a crazy idea about having a 3-Dimensional
UI for the Admin.  Inspired by what appeared to be the advent of multi-touch interfaces entering
the mainstream from Microsoft's Surface (not the current one you're used to but the original
[big ass table Surface](https://www.youtube.com/watch?v=t2ty_QIWspE){:target="_blank"}) as well as the
newly launched iPhone (yes it was that long ago).  I myself had been using a multi-touch Tablet PC
for several years at that point and was waiting for the right project to take advantage of what I
thought was a groundbreaking technology.

It dawned on me that what the team needed was a simplified way of generating
the screens on which they would need to design.  What they were lacking was the direction on how
to do that.

We had already gone through a brainstorming exercise to determine the different
items in our Domain Model.  From our understanding of the Domain Model, and building data-centric
applications, we new we had to provide CRUD manipulations.  So I took those two dimensions and
added the third for perspective (at the time I think I called it operational class).

What resulted was giving them an Excel sheet that looked similar to this:

| Entity  | C | R | U | D | Perspective |
|---------|---|---|---|---|-------------|
| Content |   |   |   |   | Portal      |
|         |   |   |   |   | Admin       |
|         |   |   |   |   | Report      |
| User    |   |   |   |   | Portal      |
|         |   |   |   |   | Admin       |
|         |   |   |   |   | Report      |
| Folder  |   |   |   |   | Portal      |
|         |   |   |   |   | Admin       |
|         |   |   |   |   | Report      |
| …       |   |   |   |   | …           |

How I directed them to use it was …

* … for every Entity we have for the system, they need to think about and design …
* … how each of the basic CRUD operations would occur …
* … from each of the different perspecitves

Not every entity will have every operation from every perspective, but the matrix would ensure
they're not missing anything.  Additionally, anything missing would be explicit so it would be
known to be a decision rather than an ommission.

## Solving More Problems

As we went through this exercise, it seemed to me we had come up with a way to solve more problems
than just ours, as well as a way to easily [Design Apps as a Platform](platform.md).
