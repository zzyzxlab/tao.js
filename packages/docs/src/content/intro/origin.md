# Origin of `tao.js`

tao.js is the culmination of the pursuit of an idea that has been gnawing at me for a long time.

Almost a decade ago I was stuck with a problem:
> How do I explain to a set of engineers the various aspects of an Application we were in the
> process of architecting in a way that will exhaustively collect all of the necessary requirements
> without missing anything while at the same time not having to define everything myself up front?

That's when I realized a traditional 2-dimensional matrix (Entity x Operation) wasn't enough to capture all of the requirements.
By adding a 3rd dimension (Perspective) I was able to effectively communicate the concepts to the team as well as allow them to see where they had gaps they needed to fill in.

After I did some work with the 3-Dimensional Requirements Matrix, I wondered if it would be possible to translate this way of defining an
Application into actual code.  This led to the architectural concept of:

> Defining an Application as the _Set_ of Application Contexts that it supports as a Triple
> (3-Dimensional Tuple), where all activity within the Application is a transition from one
> Application Context to another.

If there was a framework that could leverage these definitions to wire up functions (as handlers)
that would react to the AppCons, then it would unlock an architecture completely built on
composition from the start, allowing the system itself to evolve without acruing technical debt.

And, if that same framework allowed for handlers to be defined on _Wildcards_ of any or all of
the 3 Dimensions that make up an AppCon, then we would have the power of injecting _Crosscutting
Aspects_ in between the normal application logic while keeping them separated in the code.

This led me on a quest to discover how to make this happen as well as solve the problems of
the design which led to the eventual creation of tao.js which takes its name from how an
AppCon is defined:

**T**erm - the _thing_ in the context - conceptually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ from which the User or Actor interacting with the system has
during this _operation_ on this _thing_
