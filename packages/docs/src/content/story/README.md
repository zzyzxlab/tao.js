# An Origin Story for the TAO Programming Model

Sometimes and for some people it is important to understand a bit of history in how a thing
came about in order to grok the thing or fully grasp the implications of it, and why it is a
natural and useful progression of things we already do.

For this reason, I'm providing a narrative walk through that illustrates how we evolve to the
TAO Programming Model.  While drawing on my experience in conceiving it, a complete
historical reference would not offer the intended outcome of helping to explain the TAO
Programming Model's value and place without meandering too much through various additional
explanations.  This I fear would further muddy the waters of what I've found to already be a
difficult topic for many to grasp.

In lieu of this full historical reference (which I may produce at some point for my own sanity),
I will walk you as the reader through the genesis of the TAO Programming Model in the same
path that I used to get to it in the hopes that it will inspire your understanding for why it
is so valuable to building data-driven applications, which represent the majority of
application development today.

We first start with a description of a [Problem](problem.md) similar to what I found myself in at
a previous company many years ago working on a rebuild of an existing application.

Within that problem, we had a set of [Requirements](reqs.md) to solve for.  Some of these were
explicit and some were implicit.

During the phase of the project when we were attempting to design the solution, I was able to
crystalize concepts that I had carried with me for some time:   
that [Apps are Data](data.md), which directed me on how best to describe our solution space to my
team using a [3-Dimensional Matrix](matrix.md).

Eventually I came to realize that what was best for our own situation was to [Design the App as a Platform](platform.md) from the start.

The beauty of this thinking was that I had wanted to make the Platform very simplistic and easy
to integrate with by focusing on what I called the [Application Context](appcons.md) as the
extension point.

This allowed for an architecture that was [Reactive](reactive.md) from the beginning with the
flexibility necessary to fit all of the desired usage scenarios.

What I eventually found was it created a new way to think about building software with the [End Result](the-tao.md)
being the TAO Programming Model, a general solution for any data-driven application without the
lock-in found in all other opinionated frameworks.
