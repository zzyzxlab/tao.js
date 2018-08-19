# A Little Bit about Me

- I'm a Professional-level Cruise Control Driver
- I excel at using the exact amount of force to close a door without it slamming
- I know when to pet a cat and when to leave a cat alone
- I am a really loud clapper
- When I want to enter a state of flow I listen to the same _song_ on repeat
  - currently that song is: Soundgarden's "Searching With My Good Eye Closed"

# Theme

**How it's being presented**
Dune
1981 Film > Dune Books > Lawrence of Arabia

tao.js
Building Apps > Describing Apps > Origin Story

**Chronological Evolution**
Dune
Lawrence of Arabia > Dune Books > 1981 Film

tao.js
Origin Story > Describing Apps > Building Apps

# Paradigms

Imperative:

- JavaScript
- Ruby
- C++
- Python

Declarative => Domain Specific

- SQL
- HTML
- CSS

Flying Spaghetti Monster aka Copy Pasta

# Decoupling

What does this really mean?

Decoupling Code vs Systems Thinking

# Programming Concepts Included

- Domain-Driven Design (DDD)
- Aspect-Oriented Programming (AOP)
- Message-Oriented
- Nano-Services Architecture (NSA) aka Serverless
- Flux Architecture applied broadly (Uni-directional data flow)

# Thread of Conversation

1. DDD
2. Message-Oriented
3. Event-driven/Event Sourcing
4. Uni-directional flow (Flux applied broadly)

2. SOA => Micro-Services = Message-Oriented Architecture


# Alternative

1. Describe the TAO
2. Show it to them
3. Explain the Genesis
4. Explaing the benefits
5. Show them more
6. Say what's next
7. Ask for help

# Protocols vs Message Format

Protocols are application specific

Message Formats don't have to be

# Starting Off - Scenario

Imagine we had to build a new wide-scoped application that we really want to be a system
of different applications and features that are pluggable.

For this we were given all the time and money in the world because our sponsors are
simultaneously working on a time-machine so whenever they complete their project we'll
just go back in time with ours.

How would we do it?

# Domain Driven Design

We would probably want to start with DDD, which is a good thing.

DDD was coined 19XX by Dude Guy Bro

In our DDD efforst, we could brainstorm and classify all of our Domain Entities.

However, DDD has 2 shortcomings that we would want to overcome.

# DDD Shortcoming #1

In DDD we elevate Entities as First-class things, but we relegate their Relationships
to something 2nd-class.

Let's consider the Relationships as 1st-Class things in our system, because it is often
the relationship between entities that is providing the business value within our apps.

We can write them as `EntityA-EntityB`, e.g. `Author-Book` or `Book-Author` knowing that
an `Author` can have more than one `Book` and a `Book` can have more than one `Author`

# DDD Shortcoming #2

The 2nd shortcoming of DDD is more insidiuous and probably leads to more wasted effort
and defects related to not capturing the right requirements when building software:

Perspective

In normal DDD, after we've come up with all of our
Bounded Contexts???

# Time-Action

What we really care about when code executes is what is happening at any given time.

Yes, in our static state model of an application there will be the state of the
system as defined by the aggregation of all pieces of state at a given time.
However, for writing code that executes, this takes a back seat to what to do
when reacting to a change, otherwise known as the Dynamic State of the Application.

# Moving on from DDD

Now that we have our Domain Model as a set of Terms, Actions and Orientations, what's next?

How are we going to architect our application?
