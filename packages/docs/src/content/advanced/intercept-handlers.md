# Intercept Handlers

The last type of handler are Intercept Handlers.  These provide a similar capability to
DOM-style Events `preventDefault()` capability, but bring it everywhere.

Intercept Handlers are also crucial components for providing [Aspect-Oriented Programming
(AOP)](https://en.wikipedia.org/wiki/Aspect-oriented_programming) capabilities to our
programs utilizing the TAO.

## Like Inline Handlers

Intercept Handlers behave exactly like Inline Handlers with the difference that Intercept
Handlers react to the **return value** of the function set as the Inline Handler.

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
// add Async Handler to trigger our out of band search for the User's Session by chaining
TAO.addInterceptHandler({ t: 'Space', a: 'Update', o: 'Portal' }, (tao, data) => {
  const validationErrors = isSpaceValid(data.Space, data.Update);
  if (validationErrors) {
    return new AppCon('Space', 'Fail', 'Portal', {
      Space: data.Space,
      Fail: {
        on: tao.a,
        Update: data.Update,
      }
    });
  }
});

function checkUserAuthorizedToUpdateSpace(tao, { Space, Portal }) {
  if (!isAuthorized(Portal.user, Space)) {
    return new AppCon('Space', 'Enter', 'Portal', { Space, Portal });
  }
}

// add Async Handler to fetch a User when a Session is entered
TAO.addInterceptHandler({ t: 'Space', a: 'Edit', o: 'Portal' }, checkUserAuthorizedToUpdateSpace);

// update tracking for user in external tracking system
TAO.addInterceptHandler({ t: 'Space', a: 'Update', o: 'Portal' }, checkUserAuthorizedToUpdateSpace)
```

## Chaining Intercept Handlers

As mentioned [above](#like-inline-handlers), any return value from an Intercept Handler will
halt a chain, and an `AppCon` returned from an Intercept Handler will instruct the TAO to
set thte context to that `AppCon`.

Based on this, chaining with Intercept Handlers is very powerful in that it's the **only** way
to intercept the proceeedings that gives the ability to signal the App to do something else.

## Error Handling

