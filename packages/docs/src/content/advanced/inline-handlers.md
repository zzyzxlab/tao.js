# Inline Handlers

We saw Inline Handlers first in the [Basics](../basics) guides to introduce [adding handlers](../basics/handlers.md)
to the TAO.  As the first part of understanding the 3 different Types or Modes of handlers,
it's best to start with Inline Handlers which most closely resemble what you're used to with
traditional Event-based handlers.

## Inline = Ordered

Inline Handlers operate like standard Event listeners in other areas of JavaScript in that the
handlers are guaranteed to be called in the order in which they were registered (added) to the
TAO for a taople ("Event").

This guarantee is modified when it comes to using [Wildcard Handlers](../basics/wildcards.md) because internally each taople is managing it's own set of handlers.  While all matching
Wildcard Handlers will be called along with all of the Concrete Handlers, they will be called in
the order that the taoples themselves were added to the TAO, and the order per taople that each
handler was added as this will be the traversal order used by the TAO.

Suffice to say, it's best not to rely on exact ordering for handlers in the TAO, even Inline
Handlers, and write them as if they can be called at any point in the Set of Inline Handlers.

If you do want guaranteed ordering, then meticulously track the order in which taoples are added
to the TAO.

## Trying this again…Inline = Ordered?^?^? {#inline-order-guarantee}

> So what is meant by "Inline = Ordered?"  
> Good question.  
>    \- exchange with everyone who read the above section

The reason behind the addition of the
_other 2_ types or modes of handlers is to provide specific guarantees about when handlers
will be called and how they will affect our Systems and Applications.

The _meaning_ behind "Inline = Ordered" is that **each Inline Handler will complete before the
next is called.**  In other words, when adding 2 Inline Handlers to the TAO for the same
Application Context, whether the taople for both is Concrete, Wildcard or they are added to
a combination of the two, only _**one Inline Handler**_ will be executed _**to completion**_
before the next is called.

This guarantee is true for **all Inline Handlers** even if the handler itself is an `async`
function or returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

Example of ordering:

```javascript
TAO.addInlineHandler({ t: 'User', a: 'Find', o: 'Portal' }, async (tao, data) => {
  console.log('First Inline Handler in, so I will be called first');
  const users = await findUsersSomehow(data.Find);
  return new AppCon('User', 'List', 'Portal', users);
});

TAO.addInlineHandler({}, (tao, data) => {
  console.log('If no other total Wildcard handlers have been added, I will run third, after all handlers from the previously added taople');
});

TAO.addInlineHandler({ t: 'User', a: 'Find', o: 'Portal' }, (tao, data) => {
  console.log('I have something else to do for this AppCon, and will run second'); // <--- b/c the {User,Find,Portal} taople was added to the TAO first, and this handler added for it second
})
```

_**Special Note:** In all likelihood, our App will register some type of Handler on the total
Wildcard taople (`{}`) first during bootstrapping of the App, so the above scenario of it being
called 3rd is **unlikely** and only here for illustrative purposes._

## Chaining Inline Handlers

If you remember [Chaining Handlers](../basics/chaining.md) from the Basics guide, we can
return an `AppCon` from our Inline Handler in order to "chain" Application Contexts to
automatically trigger the next Application Context on the TAO.

When Inline Handlers are chaining (returning `AppCon`s), the TAO will spool up all returned
`AppCon`s so that all Inline Handlers are completed per the [above :point_up_2:](#inline-order-guarantee)
guarantee _**before**_ it sets the Application Context to the returned `AppCon`s.

If more than one Inline Handler returns an `AppCon` then each `AppCon` will set the Application
Context on the TAO in the order in which they were received, mirroring the order in which
the Inline Handlers were called.

## Chaining = Fanout

Because the TAO is designed so that calls to `setCtx` and `setAppCtx` do not block the caller,
in the process of chaining Inline Handlers (either _intially_ or for any single _downstream_
`AppCon` handling), if the TAO receives multiple `AppCon`s, it will not block on each `AppCon`
before setting the Application Context to a second or more `AppCon`.

This means that registering multiple Inline Handlers to react to an Application Context and then
returning `AppCon`s from more than one will operate as a **Fan Out** operation and **not a
Sequential** set of setting Application Contexts on the TAO.

## Error Handling

As mentioned in the Basics guide about [Handlers throwing Errors](../basics/handlers.md#handlers-throwing-errors),
**intial** Inline Handlers that throw an `Error` will bubble the `Error` (not catch) to the
caller that is setting the Application Context on the TAO, e.g.:

```javascript
TAO.addInlineHandler({ t: 'User', a: 'Find', o: 'Portal' }, (tao, data) => {
  throw new Error('I can\'t find Users now!');
});

TAO.setCtx('User', 'Find', 'Portal'); // <---- will have uncaught Error
```

## Downstream Errors are Swallowed

**However,** when an Inline Handler chains by returning an `AppCon`, the inner call to setting
the downstream Application Context using the chained `AppCon` will swallow any `Error`s that
are raised.  This is provided by the TAO to ensure that downstream calls that may be
unanticipated will not blow up your app, or stated otherwise, the TAO provides a guarantee
of graceful degradation.

This is a specific _design choice_ around a Functional Programming Principle to decouple
knowledge and responsibility within Apps and Systems built using the TAO.
