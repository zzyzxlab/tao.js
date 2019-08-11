# Antifragile Software

You won't find a definition for _antifragile_
in a dictionary or at [dictionary.com](https://www.dictionary.com/browse/antifragile).

Nicholas Taleb coined it in his book of the same title,
[Antifragile: Things That Gain from Disorder](https://en.wikipedia.org/wiki/Antifragile).

In his own words:

> Some things benefit from shocks; they thrive and grow when exposed to
> volatility, randomness, disorder, and stressors and love adventure, risk,
> and uncertainty. Yet, in spite of the ubiquity of the phenomenon, there is
> no word for the exact opposite of fragile

His purpose with defining the word and writing a treatise about it
was to define and explain what is the opposite of _[fragile](https://www.dictionary.com/browse/antifragile)_.
He argues that _resilience_ or _robustness_ aren't sufficient to be the
_opposite_ of _fragile_ because…

> The resilient resists shocks and stays the same; the antifragile gets better

## Software-based Products **are** Antifragile

Products built using software are antifragile through a process Taleb refers
to as _Stochastic Tinkering_.  Every time we find something wrong with a
software product, we log a bug or feature request and then go and fix it or
add the missing feature.

Over time, if a product can last long enough, it will come to meet the needs
of its customers, and thus is getting stronger with each newfound bug or
missing feature.

This is true of software products that are in customers hands.  This cannot
be said of software products that have yet to be delivered.

### Via Negativa

Taleb likes to say knowledge is gained _"via negativa"_, knowledge is
attained by removing failures rather than by asserting holistic truths.

This is how knowledge of what a product needs to do for its customers is
attained, by being in the hands of customers and learning what it should
not be doing.

This allows for accepting and responding to many little failures by not
being predisposed to any presupposed outcomes.  This leads to to antifragile
discoveries that wouldn't be found by someone asked to prove a specific
theory.

## Software is Fragile

We would like to think that the software underlying the software products
we build are antifragile just like the products but they're not.

Often times, the more changes we introduce to our software through features
being added to the product introduce choices in the form of technical debt
or ...

Architectural choices we make for our software often work to increase
calcification of the code base in specific areas to the point that it is
very brittle to change, and often breaks at the slightest modifications.

Software architecture decisions are by definition a trade-off choice of
overfitting to either the current use or some future use that is at best
a probability and at worst a complete unknown.

## Making Software Antifragile

To be Antifragile we must **enforce a constraint** that:
> no part of the System is too big to be swapped out entirely

This allows for tinkering and testing the effects of changes easily.

### How do we accomplish this?

**Application Functionality** - that which we use the software to
accomplish - should be implemented in as small slices as possible which
will satisfy the job.

**Application Architecture** - that on which the application relies for
certain guarantees - should exhibit the property that it can evolve
completely independent from the Application Functionality.

Going back to Taleb's definition of antifragile

> they thrive and grow when exposed to
> volatility, randomness, disorder, and stressors

From here we need to define these in terms of software:

* Volatility -
* Randomness -
* Disorder -
* Stressors - changes to requirements (any kind)

