# Outline

1. Describe the TAO - 1 min
1. Show some code
   * client-side - 4 mins
   * server-side - 4 mins
   * see? they're the same
1. Why do I want this? - 3 mins
   * entropy
   * embrace the entropy
1. How do we do this? - 1 min
   * what do we need?
1. DDD - 1 min
1. Message-oriented/Event-Sourcing - 1 min
1. Uni-directional (Flux) - 1 min
1. Improved Event-driven => AOP through Handler Lifecycle - 1 min
1. What do we get? - 3 mins
   * a way to define our system in non-technical language
   * that way translates directly to the code
   * a known way to extend (evolve) our system with a mechanism for dynamic extension points
   * MORE HERE
1. Let's evolve our example app - 10 mins
   * logging
   * routing
   * router as a Feature
1. Ask for help - 1 min
   * this is very new
   * here's what's to come
   * looking for help in all areas of the project

# Alternative

1. Describe the TAO
2. Show it to them
3. Explain the Genesis
4. Explaing the benefits
5. Show them more
6. Say what's next
7. Ask for help

# Describe the TAO

Let's start with a new _way_ of programming called the TAO.

## Message Format

The TAO is partially an acronym for:  
**T**erm - what is the subject of our message?  
**A**ction - what operation is occurring in our message?  
**O**rient(ation) - from what perspective is our message coming?

This description is used to identify a strict message format that can
universally define any context an application can take.

## System of Handlers

The TAO also defines a generalized way of setting the context of an
application through TAO messages, and attach handlers to respond to
those messages.

The TAO defines 3 different types of handlers:

* inline - happening in ordered sequence - desired effects
* async - happening out of band - desired side-effects
* intercept - having the capability of halting execution - guards

# See it in Action

Show some client-side code

Show some server-side code

# Why would I want to build apps like this?

en·tro·py
/ˈentrəpē/
_noun_

1. `PHYSICS`
   a thermodynamic quantity representing the unavailability of a system's thermal energy for conversion into mechanical work, often interpreted as the degree of disorder or randomness in the system.
2. lack of order or predictability; gradual decline into disorder.

## Greek Origin

With its Greek prefix en-, meaning "within", and the trop- root here meaning "change", entropy basically means "change within (a closed system)". The closed system we usually think of when speaking of entropy (especially if we're not physicists) is the entire universe. But entropy applies to closed systems of any size. Entropy is seen when the ice in a glass of water in a warm room melts—that is, as the temperature of everything in the room evens out. In a slightly different type of entropy, a drop of food coloring in that glass of water soon spreads out evenly. However, when a nonphysicist uses the word, he or she is usually trying to describe a large-scale collapse.

## MY commentary

Armed with my GoF knowledge and countless Patterns books I consumed, I petitioned
my first boss as a professional programmer in a corporation to present Design
Patterns to our team and how we should be embracing them.  How could I lose on
this one?  This was going to be a way to make a name for myself within the team
and the organization.

His response:

> All software approaches a state of entropy over time so I don't see any point in
> Design Patterns

_«jaw drop»_

He was right.  All software does approach a state of entropy over time.

Varying architectural efforts in their own way attempt to contain and
control this entropy.  But what if we embraced it completely, and developed
our applications which expected entropy to be part of the evolution of
the application?

# How do we do this?

What do we need?

* A way to describe our application
* Loose coupling
* Transparent Scalability

Invert the message from calling a function _on an_ object to sending a message
_with an_ object.

Let's start by using something we're already familiar with

Building in the now with an eye for the what if without building all of the
plumbing for that what if.

So how do we do this?

1. Provide a description of the application that shows up in the code
   * DDD => Terms
2. A mix of Architectural Best Practices that reduce technical debt
   * scalability - message-oriented
   * decoupling - flux uni-directional data flow
   * cross-cutting & extension points - AOP
3. Don't spend time building those architectural pieces
4. Open Architecture allowing freedom of choices to use the right tool
   * any function adhering to the format can be added as a handler
5. Standardize the How but not the What
6. Provide a mechanism to stitch message flows together as a Protocol

# Message-Oriented

When one object calls a method of another object, it is passing a message


* Standardize the message format across all systems
* Allow a simplified and standard way of defining protocols - sequencing of events/messages (tao-path)
* Provide flexibility in where the code executes
* Provide flexibility in when the code executes (3 handler types)
* Use Architectural Best Practices baked in for:
  * scalability
  * decoupling


A simple goal: let's see if we can rapidly build applications that
take advantage of architectural best practices and decoupling while
reducing our chances of technical debt without incurring the overhead
associated with such efforts

Simple, right?

## Architectural Best Practices

## Decoupling

## Reducing Technical Debt

## No Overhead Effort over Rapid Prototyping

