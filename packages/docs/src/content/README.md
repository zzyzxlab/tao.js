# tao.js

A new _way_ of developing software with a few simple goals (more in the [Intro: Motivations & Goals](intro/motivations.md))

1. Use a simplified language that _elicits_ communication between Engineers and Product Managers
1. Leverage that language to build the software
1. Build software with the intent that it will evolve

Go to [Introduction](/intro/README.md) section for more

## What is tao.js?

tao.js is a JavaScript library of packages built to implement the TAO in JavaScript and
make it easy to integrate with other popular JavaScript frameworks for building Apps.

## Fine, don't answer. What is the TAO then?

The TAO is a programming paradigm designed around splitting up any System or Application
into very granular constituent parts organized to respond to a common message format,
a 3-dimensional tuple, aka a triple, with a very specific set of 3 attributes that
can be used to describe _any_ Application Context of a System or Application.  These
are affectionately referred to as "taoples" because of their form as not being
generalized tuples (or generalized triples).

The attributes of a taople follow the acronym of the TAO (or T.A.O.) to make it easy
to remember:

**T**erm - the _thing_ in the context - conceptually usually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ of the interaction with the system at
the moment of this _operation_ on this _thing_  

Describing a System or Application as a _Set of taoples_ has the specific intent of making
it easy to communicate in non-technical terms what the software _should_ or _intends_ to do.

Once the software has been sufficiently decomposed in this way, it is reconstituted thru
generating and passing these messages to functions known as handlers that perform the
value added activities of the program.

Leveraging the handler as the unit of execution allows the software to built to run in
any execution environment.

## Power of a Common Form of Event & Message

By making all events and messages follow a common format, there is no longer any need
to negotiate particular interfaces between the various layers or parts of a System or
Application, thus making it a simplified programming paradigm to accept and encourage
best practices in building software.
