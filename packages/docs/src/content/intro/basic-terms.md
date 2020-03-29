# Basic Terminology

At its core, an Application is a set of [State Machine](https://en.wikipedia.org/wiki/Finite-state_machine)s
consisting of various _States_, _Transitions_ from state to state, and _Rules_ and _Logic_ that
constrain the transitions between states.

## Abstract States represented by 3-Dimensional Tuples {#3d-tuples}

tao.js expresses the Abstract States of an Application to represent distinct Application Contexts
through the use of 3-Dimensional tuples.  These tuples are referred to as trigrams because of their
distinct structure defined by 3 specific aspects:

**T**erm - the _thing_ in the context - conceptually usually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ of the interaction with the system at
the moment of this _operation_ on this _thing_  

Trigrams are formally defined in description and in code using distinct `String`s for each aspect
making up a member of the _Set_.  
An example trigram descriptor using set notation would be: `{User, Find, Portal}`  
Translating this to code that executes with tao.js you will see it as either:

* an Object hash: `{ t: 'User', a: 'Find', o: 'Portal' }`  
  OR
* an Array of strict ordering based on the TAO acronym: `['User', 'Find', 'Portal']`

Trigrams represent _possible_ states of the application as a context that can be executed
within the application.

## AppCons are Actual States

tao.js expresses the Actual States of an Application through the use of AppCons, representing
Application Contexts through which an Actor transitions while interacting with the Application.

AppCons differ from trigrams in that they can (not required) include associated data for any or all
of the 3 aspects of the trigram.

This is most often expressed as an individual or list of Objects that represent the Term for
the given Context, but don't limit your thinking to attaching all individual AppCon data to
Terms alone.  Distinct Actions can also be expressed with the Action's data, e.g. `Find` could contain either an individual `id` used to fetch the given Object representing the Term or a set of search criteria to get a list of Objects representing the Term.  The same goes for Orient(ation)s
which it's often helpful to attach authorization, session or other data that distinguishes
individual Actual States of a given Orient(ation).

## The "State" of an App is Complex

The _"State"_ of an Appplication at any point is a complex combination of many varying factors.

The TAO captures this by breaking down individual portions of the _State_ into constituent
Application Contexts which:

* make it easier to reason about the _State_ of an App
* allow rich interactions as reactions to the transitions of _State_ reflecting the true
  representation of an App explicitly
