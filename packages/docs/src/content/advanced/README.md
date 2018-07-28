# Advanced usage of `tao.js`

One of the ways tao.js goes beyond standard Event-based programming is by providing
several ways of handling Application Contexts that are raised/triggered/set on the
TAO.  They're presented here in the following order to make it easier to learn and
understand, but as you will see are presented in the reverse order of their precedence.

This is one of the mechanisms that contributes to giving the TAO its ability to provide
System-wide [Aspect-Oriented Programming (AOP)](https://en.wikipedia.org/wiki/Aspect-oriented_programming), which is something that
traditional AOP does not attempt.

The handler Types or Modes to be more accurate are:

* [Inline Handlers](inline-handlers.md)
* [Async Handlers](async-handlers.md)
* [Intercept Handlers](intercept-handlers.md)

The follow up guide explains the order in which handlers are executed.  It only makes
sense once you understand the different Types of handlers, but once you do, it is
important to gaining a full understanding of how to use each different Type to take
full advantage of what the TAO provides:

* [Handler Order of Precedence](order-of-handlers.md)

Finally, a few more advanced topics provided by the TAO and tao.js that will allow
you to do even more, but these are rarely used and really are used for internal
package (`@tao.js/*`) implementations:

* [Promise Hook](promise-hook.md)
* [Instantiating Kernels](kernels.md)
