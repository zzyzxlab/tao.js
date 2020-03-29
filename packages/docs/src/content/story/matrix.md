# Building a Matrix

Your team is well aware of the [Feature Requirements](reqs.md#feature-requirements) and
the [API Requirements](reqs.md#api-requirements) plus the direction to
build separate applications for the major usage scenarios.  Additionally the [Packaging Requirements](reqs.md#packaging-requirements)
represent a challenge to your team that they haven't faced in the past, so they're unsure of
how to solve it and it is causing some confusion.

## Team Struggles

Your team is struggling to figure out how to design the User Interfaces for the new build of the
Media Management applications.  They come to you with questions since you seem to have a good
grasp on what to do at this point:

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

![from _A Requirements Pattern_](reqs_pattern_book.png)

## 3-Dimensions

Perspective again!  Perspective is so important for so many things.

It dawns on you that what the team needed was a simplified way of generating a list of the
screens they would need to design.  What they were lacking was the direction on how
to do that.

So you take the team through a brainstorming exercise to determine the different
items in your Domain Model.  From your understanding of the Domain Model, and having built data-centric
applications many times over, you know the application has to provide CRUD manipulations.  So you take those two dimensions (Entities & Operations) and
add the third for Perspective.

What results is giving the team an Excel sheet that looks similar to this:

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

How you direct them to use it is …

* … for every Entity we have for the system, they need to think about and design …
* … how each of the basic CRUD operations would occur …
* … from each of the different perspectives

Not every entity will have every operation from every perspective, but the matrix would ensure
they're not missing anything.  Additionally, anything missing would be explicit so it would be
known to be a decision rather than an ommission.

## Solving More Problems

As you continue this exercise, it _seems_ to you this could be a way to solve more problems
than just ours, as well as a way to easily [Design Apps as a Platform](platform.md), but there's
more to do.
