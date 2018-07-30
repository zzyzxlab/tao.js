# Order of Operations

The TAO gives us 3 ways to handle Application Contexts using [Intercept](intercept-handlers.md),
[Async](async-handlers.md) and [Inline](inline-handlers.md) Handlers.

These 3 modes were chosen specifically to provide us with enough power to handle any case
as well as flexibility to keep our code decoupled.

Now that we understand what the TAO guarantees about each individual type of handler, to fully
grasp how to utilize the 3 to their best, we want to understand the guarantees the TAO provides
for how they all work together in the TAO.

## Intercept > Async > Inline

Put simply, when an Application Context is set on the TAO, it will call all of the registered
handlers in the following precedence:

1. **Intercept Handlers** - all called before calling…
2. **Async Handlers** - all called before calling…
3. **Inline Handlers** - all called before setting all `AppCon`s chained _**from Inline Handlers**_

In this context "all called" translates to all handlers of a given type (Intercept, Async, or
Inline), no matter if the handler was added to a Concrete or Wildcard that matches the
Application Context that was set on the TAO.

In essence, what the TAO is doing is:

> First run a special set of handlers (Intercept) that can prevent both other handlers from
> being called as well as the execution of downstream TAO-Paths in the form of chaining
> to get the interrupt logic out of the way.  Once the App has made it passed these checks,
> kick off **all _out-of-band_** operations before running all of the normal operations used
> to implement the desired effect of setting the Application Context.

In other words, Intercept Handlers _**are**_ Inline Handlers with 2 differences, they run
first **and** they have the power to stop execution.  Inline Handlers cannot prevent any other
handlers from being called.  We have our special Inline Handlers as Intercept Handlers run
first in order to provide guards that test the constraints of the App before making a
state transition.

The Async Handlers are called in the middle (after constraint checks but before regular)
so that we don't block the _desired side effects_ of our transition by the normal flow
of execution of the regular (Inline) handlers.

A further breakdown of the order of precedence (or operations) is that when the TAO is told
that our App has entered a specific Application Context, it gives our App code:

1. first, a way to prevent any further activity
2. second, a way to kick off important operations that we want to occur without blocking
3. finally, a way of executing the specific behavior we want to occur for this Application
  Context

## ONLY Guaranteed Ordering by the TAO

**This** :point_up_2: represents the **ONLY** ordering guarantee provided by the TAO.

This is very important as it was specifically designed this way.  Ordering amongst handlers
of the same type (or mode) **should not be relied upon** as handlers can be added and
removed dynamically throughout the course of our Apps executing.

To rely on order guarantees in our Apps, we use this stated ordering guarantee from the
TAO and design/build our Apps to:

* use the 3 different handler types to ensure ordered execution on a single Application
  Context
* use different Application Contexts with chaining to ensure ordered execution of the
  desired flow of operations

## Further Uses of Intercept Handlers

Because the **only way** to guarantee a handler will be called first (or in the first group)
is to add it to the TAO as an Intercept Handler, we will use these often for utility beyond
simply constraint checks.

An example is logging all Application Contexts set on the TAO during development.  As a
tool, we can simply add a Wildcard Intercept Handler like this when bootstrapping our
App:

```javascript
TAO.addInterceptHandler({}, (tao, data) => {
  console.log(`context set as {${tao.t},${tao.a},${tao.o}} with data:`, data);
});
```

Because this Intercept Handler returns nothing, it won't have any downstream affect
on the execution of other handlers for all Application Contexts apart from the effect
of logging to the console for each one.

In this way, Intercept Handlers provide a **dual purpose** on the TAO:

1. Provide checks and guards (main intent)
1. Allow injecting guarantee first execution for a handler

## Inline Handlers are the Bread & Butter

That being said, Inline Handlers represent the bulk of what you want to be adding to
the TAO.  Most applications can be written with a very linear flow of operations which
is what Inline Handlers were designed to tackle.

If you find yourself relying on Intercept Handlers to guarantee the order of operations,
first ask:

> **Would it be better to split the Application Context into more than one, and use
> chaining to order the operations?**

This is what chaining was designed to accomplish, and why TAO-based Apps are built
with finer granularity of Application Contexts to represent states within an App
than what most expect coming from other programming paradigms.

When it comes to Async Handlers, it's recommended to reserve their use to sets of
operations which you want out of band from the expected flow in order to provide either:

* a better User experience…  
  or
* better performance…  
  …on
* an operation that isn't critical to the expected outcome of the specific Application
  Context.
