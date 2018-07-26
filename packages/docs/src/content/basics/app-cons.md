# Application Contexts (AppCons)

At its core, an Application is a set of [State Machine](https://en.wikipedia.org/wiki/Finite-state_machine)s
consisting of various _States_, _Transitions_ from state to state, and _Rules_ and _Logic_ that
constrain the transitions between states.

## the TAO represent Abstract States

tao.js expresses the Abstract States of an Application through the use of the TAO, previously
written and repeated for clarity as:

**T**erm - the _thing_ in the context - conceptually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ from which the User or Actor interacting with the system has
during this _operation_ on this _thing_ at this moment

TAOs are formally defined in description and in code using distinct `String`s for each aspect
making up a member of the _Set_.  
An example descriptor would be: `{User, Find, Portal}`  
Translating this to code that executes with tao.js you will see it as either:

* an Object hash: `{ t: 'User', a: 'Find', o: 'Portal' }`  
  OR
* an Array of strict ordering based on the TAO acronym: `['User', 'Find', 'Portal']`

The TAO represents a _possible_ state of the application as a context that can be executed
within the application.

## AppCons are Actual States

tao.js expresses the Actual States of an Application through the use of AppCons, representing
Application Contexts through which an Actor transitions while interacting with the Application.

AppCons differ from the TAO in that they can (not required) include associated data for any or all
of the 3 aspects of the TAO.

This is most often expressed as an individual or list of Objects that represent the Term for
the given Context, but don't limit your thinking to attaching all individual AppCon data to
Terms alone.  Distinct Actions can also be expressed with the Action's data, e.g. `Find` could contain either an individual `id` used to fetch the given Object representing the Term or a set of search criteria to get a list of Objects reprenting the Term.  The same goes for Orient(ation)s
which it's often helpful to attach authorization or session data.

## Example Application

Before moving ahead, it's important to describe the application most often used in examples throughout this book which is that of an individualized
version of Urban Dictionary.  This App has a Domain Model starting with:

* `Space`s that create an individual dictionary of
* `Phrase`s that are the words or groups of words + definitions of them
* `User`s that can be invited to a `Space` and create `Phrase`s in that `Space`
* `Session`s capturing when each `User` is interacting with the App
* and the `App` itself

These Domain Entities translate directly to Terms of the TAO for the App along with the relationships:

* `Space-Phrase` since a `Phrase` can be shared and exist in more than one `Space`
* `Space-User` since `User`s can create or be invited to join more than one `Space`

## Define your AppCons ahead of writing code

From the [Goals of tao.js](../intro/goals.md) we want to use the language of the TAO to describe
our application as a set of code-translatable requirements that can be understood by technical
and non-technical members of the team.

It is best to start from this place by describing your application as a series of TAOs representing
possible states and transitions from one to the next to generate a protocol chain that describes
the interaction an Actor has with your App.

### Example AppCon descriptions

It's much easier to whiteboard this or draw it on a piece of paper, but for documentations sake
(and future [roadmap](../intro/roadmap.md) consideration) we're going to provide an example in
markdown.  A good place to start is the intial Use Case of a User coming to the App to begin a new Session:

|from TAO               |to TAO                 |description|
|-----------------------|-----------------------|-----------|
||`{App,Enter,Portal}`|initial TAO that sets the App in motion (this can be anything you want)|
|`{App,Enter,Portal}`|->`{App,View,Portal}`|after entering, we want to show the App's Portal|
|`{App,View,Portal}`|->`{Space,Find,Portal}`|visitng the App's initial Portal View triggers a fetch for the items that should be visible|
|`{Space,Find,Portal}`|->`{Space,List,Portal}`|with the items, render the list for the User|

Another example is selecting a `Space` from the initial list presented for the User to enter:

|from TAO|to TAO|description|
|--------|------|-------------|
|`<user triggered>`|`{Space, Enter, Portal}`|initial triggering TAO that begins the Use Case|
|`{Space, Enter, Portal}`|->`{Space, View, Portal}`|show the Space View to the User|
|`{Space, Enter, Portal}`|->`{Space-Phrase,Find,Portal}`|entering the Space triggers a fetch for the related items|
|`{Space-Phrase, Find, Portal}`|->`{Space-Phrase, List, Portal}`|list the found items for the User|

## Using AppCons in your Application

To use `AppCon`s in your application, you must first import the TAO into the file that will
_signal_ a change in Application Context:

```javascript
import TAO from '@tao.js/core';
```
OR
```javascript
const TAO = require('@tao.js/core');
```

### Setting Context

Signal a change in Application Context by using the `setCtx` method on the TAO:

```javascript
TAO.setCtx({ t: 'App', a: 'Enter', o: 'Portal' });
// OR
TAO.setCtx({ term: 'App', action: 'Enter', orient: 'Portal' });
```

### Include Data when Setting Context

You can also pass along data as the 2nd argument to the `setCtx` method on the TAO.

Data can be included in several different forms.

#### 1. as an `Object` with properties of the same names as the taople

```javascript
TAO.setCtx({ t: 'App', a: 'Enter', o: 'Portal' }, {
  App: {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  Enter: { … },
  Portal: { … },
});
```

_**Special Note:** not all properties from the taople are required, the inclusion of
`Enter` and `Portal` are illustrative here_

#### 2. as an `Object` with properties named `t` or `term`, `a` or `action`, and/or `o` or `orient`:

```javascript
TAO.setCtx({ t: 'App', a: 'Enter', o: 'Portal' }, {
  t: {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  a: { … },
  o: { … },
});
// OR
TAO.setCtx({ term: 'App', action: 'Enter', orient: 'Portal' }, {
  term: {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  action: { … },
  orient: { … },
});
```

This form can be useful when the setting of the context is more dynamic and the keys
aren't necessarily known ahead of time.  Additionally, the forms can be mixed if you want.

_**Special Note:** no matter how the data is passed in, when we look at [handlers](handlers.md)
the data sent to the handler will **always** be consistent in the form from the first option
as properties using the names identified by the taople_

#### 3. as an `Array` ordered as `[term, action, orient]`

```javascript
TAO.setCtx({ t: 'App', a: 'Enter', o: 'Portal' }, [
  {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  { … },
  { … },
]);
```

_**Special Note:** not all properties from the taople are required, the inclusion of
all 3 entries is illustrative here_

### Create an `AppCon` and set Context

The `@tao.js/core` package also exports a class called `AppCon` that allows you to
instantiate instances of `AppCon`s to then pass to the TAO using `setAppCtx`.

First, ensure you are importing it where you plan to use it:

```javascript
import TAO, { AppCon } from '@tao.js/core';
```
OR
```javascript
const TAO, { AppCon } = require('@tao.js/core');
```

Next instantiate an `AppCon` and set it using `setAppCtx`:

```javascript
const appEnterPortal = new AppCon('App', 'Enter', 'Portal');
…
TAO.setAppCtx(appEnterPortal);
```

### Create an `AppCon` with data and set Context

Instantiating `AppCon`s with data is very similar to [passing data directly](#include-data-when-setting-context)
to the TAO's `setCtx` method by using the arguments **after** the first 3 args.

Like `setCtx`, the `AppCon` constructor offers several options.

#### 1. as a single `Object` with properties of the same names as the taople

```javascript
const appEnterPortal = new AppCon('App', 'Enter', 'Portal', {
  App: {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  Enter: { … },
  Portal: { … },
});
…
TAO.setAppCtx(appEnterPortal);
```

#### 2. as a single `Object` with properties named `t` or `term`, `a` or `action`, and/or `o` or `orient`

```javascript
const appEnterPortal = new AppCon('App', 'Enter', 'Portal', {
  t: {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  a: { … },
  o: { … },
});
// OR
const appEnterPortal = new AppCon('App', 'Enter', 'Portal', {
  term: {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  action: { … },
  orient: { … },
});
…
TAO.setAppCtx(appEnterPortal);
```

#### 3. as an `Array` ordered as `[term, action, orient]`

```javascript
const appEnterPortal = new AppCon('App', 'Enter', 'Portal', [
  {
    title: 'Patois - words for the way you talk',
    url: 'https://pato.is'
  },
  { … },
  { … },
]);
…
TAO.setAppCtx(appEnterPortal);
```

_**Special Note:** not all properties from the taople are required, the inclusion of
all 3 entries is illustrative here_

#### 4. as a set of up to 3 args in series ordered as `term`, `action`, `orient`

```javascript
const appEnterPortal = new AppCon('App', 'Enter', 'Portal', { title: 'Patois - …' }, new Date(), { … });
…
TAO.setAppCtx(appEnterPortal);
```

**This Example** illustrates that data can be set for an `AppCon` that is not necessarily
itself an `Object` in the case of setting the `Enter` Action data to a `Date` value, and this is possible for any of the other forms of setting data above, not
just this form.

### `AppCon` instantiation has more to offer

You can also export `AppCon`s to be imported and used elswehwere in your app.

`AppCon` instantiation will also come in to play when we look at [Chaining AppCons](chaining.md).
