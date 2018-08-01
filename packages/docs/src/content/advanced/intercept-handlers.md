# Intercept Handlers

The last type of handler are Intercept Handlers.  These provide a similar capability to
DOM-style Events `preventDefault()` capability, but bring it everywhere.

Intercept Handlers are also crucial components for providing [Aspect-Oriented Programming
(AOP)](https://en.wikipedia.org/wiki/Aspect-oriented_programming) capabilities to our
programs utilizing the TAO.

## Like Inline Handlers

Intercept Handlers behave exactly like Inline Handlers, they are called one-by-one using
the same [rules for ordering](inline-handlers.md#inline-order-guarantee) outlined there,
with the difference that Intercept Handlers react to the **return value** of the function
set as the Intercept Handler.

The check against the return value of the Intercept Handler results in the following:

1. A [falsey](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) value means the TAO
  will continue to the next handler
1. A [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy) value means
  the TAO will stop calling any more handlers - effectively intercepting all handlers
  waiting for the current AppCon and downstream AppCons (chained) and handler calls
  on them.
1. An `AppCon` - is considered `truthy` so it intercepts like above, **plus** the TAO
  will set the context to the returned `AppCon` like chaining operates with other
  types of handlers.

## The First will Intercept

If multiple Intercept Handlers are added that would fire for a single Application
Context, then each will (as stated above) be called sequentially using the rules for
ordering Intercept Handlers.

The **first** handler that returns a [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy)
value **will halt proceedings** and if there were any remaining Intercept Handlers,
they will not be called.

## No Signal Specifically

The TAO will not signal to the caller that an Intercept Handler has stopped the
propogation of AppCons.  If this is something you need for a given Application
Context, then return an `AppCon` from the handler function and pass the desired
information within that context.

## Describing Inline Handlers for our Apps

### Use Case: User Edits Space

In our Editing of a Space example, we want to add validation so that we don't
accept and save data that makes the Space inconsistent with the defined data
rules.

|#||Term|Action|Orient||handler spec|
|---|---|----|------|------|---|-----------|
|0|User hits edit|`Space`|`Edit`|`Portal`|`=>`|get the `Space` Edit form and put it in the UI|
|1|User hits cancel|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>
|2|User hits save|`Space`|`Update`|`Portal`|`=>?!`[^a]|is updated `Space` data valid`?`<br/>`!`validation errors|
|3||`Space`|`Update`|`Portal`|`=>`|send updated `Space` data to the api|
|3|`\`<a id="fn_a">a:</a>`=>`|`Space`|`Fail`|`Portal`|`=>`|render errors in Edit form|
|4|`=>`|`Space`|`Store`|`Admin`|`=>`|store the updated `Space`'s data in primary data store for later retrieval in the `Admin`|
|5|`=>`|`Space`|`Store`|`Portal`|`=>`|store the updated `Space`'s data in cache for later retrieval in the `Portal`|
|6|`=>`|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>

Notice the duplicated taople (`{Space,Update,Portal}`) which now has 2 handlers, an Intercept
Handler denoted by the (`=>?!`[^a] ) and the Inline Handler (`=>`) it had before.  The
Intercept Handler mode symbol is a way to denote that it presents a choice (`?`) to halt (`!`)
further progression down the TAO-Path chain (and even to the next handler on the same AppCon) and
set the direction to a different AppCon ( [^a] ).

The logic of the choice being made by the Intercept Handler is detailed in the _handler spec_.
The new AppCon the Intercept Handler sets on the TAO is further down in the table identified
by the reference anchor `a:` and surrounded by an interrupted chain trigger (`\`<a name="ref">{ref}:</a>`=>`).  This symbol is used to denote that while normally a chain falls through to the next
row in the table (`=>`), this one is outside this flow (`\=>`).

In the above table, we're stating that when the `{Space,Update,Portal}` AppCon is set, we want to
first intercept the proceedings and check the validity of the data according some rules and
constraints, and if this check fails, divert to a different Application Context.  Otherwise, if
the check passes, continue to the next handler on `{Space,Update,Portal}` (in this case our Inline
Handler which continues the TAO-Path chain).

### Use Case: Refined User Edits Space

We also want to ensure the User who makes the edits has the authorization to
complete the edit of a Space.

|#|trigger|Term|Action|Orient||handler spec|
|---|---|----|------|------|---|-----------|
|0|User hits edit|`Space`|`Edit`|`Portal`|`=>?!`[^b]|can User edit `Space` `?`<br/>`!`User unauthorized|
|1||`Space`|`Edit`|`Portal`|`=>`|get the `Space` Edit form and put it in the UI|
|2|<a id="fn_b">b:</a>User unauthorized|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>
|3|User hits cancel|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>
|4|User hits save|`Space`|`Update`|`Portal`|`=>?!`[^c]|is updated `Space` data valid`?`<br/>`!`validation errors|
|5||`Space`|`Update`|`Portal`|`=>?!`[^b]|can User edit `Space` `?`<br/>`!`User unauthorized|
|6||`Space`|`Update`|`Portal`|`=>`|send the updated `Space` data to the api|
|7|`\`<a id="fn_b">c:</a>`=>`|`Space`|`Fail`|`Portal`|`=>`|render errors in Edit form|
|8|`=>`|`Space`|`Store`|`Admin`|`=>`|store the updated `Space`'s data in primary data store for later retrieval in the `Admin`|
|9|`=>`|`Space`|`Store`|`Portal`|`=>`|store the updated `Space`'s data in cache for later retrieval in the `Portal`|
|10|`=>`|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>

## Adding Intercept Handlers to the TAO

Adding Intercept Handlers to the TAO is similar to adding Inline and Async Handlers, except we're
going to call the, you guessed it, `addInterceptHandler` method instead:

```javascript
// add Intercept Handler to validate Space data during an Update
TAO.addInterceptHandler({ t: 'Space', a: 'Update', o: 'Portal' }, (tao, data) => {
  const validationErrors = isSpaceValid(data.Space, data.Update);
  if (validationErrors) {
    return new AppCon('Space', 'Fail', 'Portal', {
      Space: data.Space,
      Fail: {
        on: tao.a,
        Update: data.Update,
        Errors: validationErrors
      }
    });
  }
});

function checkUserAuthorizedToUpdateSpace(tao, { Space, Portal }) {
  if (!isAuthorized(Portal.user, Space)) {
    return new AppCon('Space', 'Enter', 'Portal', { Space, Portal });
  }
}

// add Intercept Handlers to verify the User is authorized to Edit/Update a Space
TAO.addInterceptHandler({ t: 'Space', a: 'Edit', o: 'Portal' }, checkUserAuthorizedToUpdateSpace);
TAO.addInterceptHandler({ t: 'Space', a: 'Update', o: 'Portal' }, checkUserAuthorizedToUpdateSpace)
```

## Chaining Intercept Handlers

As mentioned [above](#like-inline-handlers), any return value from an Intercept Handler will
halt a chain, and an `AppCon` returned from an Intercept Handler will instruct the TAO to
set thte context to that `AppCon`.

Based on this, chaining with Intercept Handlers is very powerful in that it's the **only** way
to intercept the proceeedings that gives the ability to signal the App to do something else.

## `async` Functions as Intercept Handlers

Just like with [Inline Handlers](inline-handlers.md#async-functions-as-inline-handlers),
we can use `async` functions or functions that return a
[`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
(both referred to as `async` functions) as an Intercept Handler.

Also, just like with Inline Handlers, the TAO will `await` for our handler to fully complete
(resolve or reject) before moving onto the next handler.

This ensures that each Intercept Handler is called in order before the TAO moves to the
next.  This will also have more impact when we learn about the [order of handlers](order-of-handlers.md).

## Error Handling

As mentioned in the Basics guide about [Handlers throwing Errors](../basics/handlers.md#handlers-throwing-errors),
**intial** Intercept Handlers that throw an `Error` will bubble the `Error` (not catch) to the
caller that is setting the Application Context on the TAO, e.g.:

```javascript
TAO.addInterceptHandler({ t: 'Space', a: 'Edit', o: 'Portal' }, (tao, data) => {
  throw new Error('I can\'t edit Spaces now! It\'s too soon.');
});

TAO.setCtx('Space', 'Edit', 'Portal'); // <---- will have uncaught Error
```

### Downstream Errors are Swallowed

**However,** when an Intercept Handler chains by returning an `AppCon`, the inner call to setting
the downstream Application Context using the chained `AppCon` will swallow any `Error`s that
are raised.  This is provided by the TAO to ensure that downstream calls that may be
unanticipated will not blow up your app, or stated otherwise, the TAO provides a guarantee
of graceful degradation.

This is a specific _design choice_ around a Functional Programming Principle to decouple
knowledge and responsibility within Apps and Systems built using the TAO.
