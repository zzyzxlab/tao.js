# Chaining AppCons

One of the principles of the TAO is using fine-grained Application Contexts
to provide a programming paradigm grounded in Functional Programming.

Handlers can tell the TAO which Application Context is next after they
complete their execution by returning an `AppCon` to the caller.

Using this mechanism, a System Actor (like a User)'s interaction with
our app can trigger a single Application Context which then triggers
a multitude of Application Contexts to generate and track the correct
behaviors of our application.

This design allows us to use fine-grained Application Context definitions
in order to keep our handlers small and focused on a Single Responsibility,
offering to allow downstream Application Contexts to react to what the
handler has done.

## Example Chain

Borrowing and reprinting from our earlier [Example AppCon Descriptions](/app-cons.md#example-appcon-descriptions):

|from TAO               |to TAO                 |description|
|-----------------------|-----------------------|-----------|
||`{App,Enter,Portal}`|initial TAO that sets the App in motion (this can be anything you want)|
|`{App,Enter,Portal}`|->`{App,View,Portal}`|after entering, we want to show the App's Portal|
|`{App,View,Portal}`|->`{Space,Find,Portal}`|visitng the App's initial Portal View triggers a fetch for the items that should be visible|
|`{Space,Find,Portal}`|->`{Space,List,Portal}`|with the items, render the list for the User|

We see that we want the `{App,Enter,Portal}` Application Context to
trigger the `{App,View,Portal}` Application Context.

## Must use AppCon Constructor

The TAO **only** reacts to `AppCon`s which are returned from handlers and
not any other form of an Application Context or trigram.  The TAO will **not**
inspect the return value of a handler other than to determine if it is
of `AppCon` type.

_This does allow you to `extend` the `AppCon` class if you so desire and
returning those will still work.  However, it's better to favor
[Composition over Inheritance]() so this isn't something you really
should consider._

## Chaining AppCon in Code

In order for our handler to chain to another AppCon, we need to ensure
we are importing both the `TAO` and `AppCon` constructor where we plan to
do it:

```javascript
import TAO, { AppCon } from '@tao.js/core';
```
OR
```javascript
const TAO, { AppCon } = require('@tao.js/core');
```

Here is a sample handler that ensures the TAO goes to the
`{App,View,Portal}` Application Context when it is finished:

```javascript
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, (tao, data) => {
  const title = data.title;
  setWindowTitleSomehow(title);
  return new AppCon('App', 'View', 'Portal', data);
});
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, (tao, data) => {
  const title = data.title;
  setWindowTitleSomehow(title);
  return new AppCon('App', 'View', 'Portal', data);
});
```

It's as simple as that, yet this mechanism becomes a very powerful force in
allowing us to split up our code into fine-grained handlers that only
focus and care about one thing, and chain them together to create protocols
to handle the rich interactivity and business logic of our apps.
