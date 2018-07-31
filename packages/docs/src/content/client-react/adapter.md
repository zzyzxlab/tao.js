# tao.js Adapter for React

To first integrate the TAO with the programming interface provided by React, we use the tao.js
`Adapter` from the `@tao.js/react` package.

## Similar model to _Official_ Context API

[React 16.3.0](https://reactjs.org/blog/2018/03/29/react-v-16-3.html) introduced the
_Official_ Context API and with it came the `Provider` and `Consumer` binary component relationship
that we can use to manage context for our `Component`s in our React Apps.

The relationship between the `Adapter` and [`Reactor`](reactor.md) is very similar to the Context
API components in that just like the `Provider` is providing values for the `Consumer` to consume
and use, the `Adapter` is providing React `Component`s for the `Reactor` to render into the UI.  You
could say that `Adapter` and `Reactor` are the _yin_ & _yang_ ☯ of `@tao.js/react` (couldn't resist).

One of the stark differences to notice however is that the `Adapter` itself is **not** a
`Component`, but it does _provide_ it's attached `Component`s to the `Reactor`.

## Adapting React `Component`s to be Handlers

The purpose of the `Adapter` is to convert our React `Component`s into handlers for the TAO.
Because React `Component`s are functions in JavaScript, we can take advantage of this to make this
adaptation easy.

The `Adapter` will work on **any** React `Component`, however we will generally design our
`Component`s to take advantage of the `props` passed to them as adapted from the [`tao`](../basics/handlers.md#tao-object-handler-arg)
and [`data`](../basics/handlers.md#data-object-handler-arg) args passed to handlers by the TAO when an Application Context is set.

## Fluent Methods

The `Adapter` provides fluent method chaining for all of the public methods that we use
on the `Adapter` by returning a reference to the `Adapter` itself from these methods.  For those
unfamiliar, fluent method chaining allows us to make a sequence of calls to the `Adapter` in a
single statement, like:

```javascript
adapter
  .setDefaultCtx({ t: 'Space', o: 'Portal' })
  .addComponentHandler({ a: 'View' }, View)
  .addComponentHandler({ a: 'List' }, List);
```

## Importing `Adapter`

First, before using the `Adapter` it must be imported along with the TAO which is the argument
passed to the `Adapter`'s constructor:

```javascript
import TAO from '@tao.js/core';
import { Adapter } from '@tao.js/react';
```
OR
```javascript
const TAO = require('@tao.js/core');
const { Adapter } = require('@tao.js/react');
```

## Using a `Component` as a Handler

Using a `Component` as a handler for an Application Context is easy.

Instead of calling the regular `add[Type]Handler` passing a handler function like:

```javascript
TAO.addInlineHandler({ t: 'Space', a: 'Enter', o: 'Portal' }, (tao, data) => {
  // do something here
});
```

We create an `Adapter` and use the `addComponentHandler` method passing along our React `Component`
like:

```javascript
import MyComponent from './MyComponent';

const adapter = new Adapter(TAO);
adapter.addComponentHandler({ t: 'Space', a: 'View', o: 'Portal' }, MyComponent);
```

When we do this, the `Adapter` adds an [Inline Handler](../advanced/inline-handlers.md) to the TAO
that will be called when the `{Space,View,Portal}` Application Context is set on the TAO.

When this occurs (the AppCon is set to what we're listening for), the `Adapter` will make the
`Component` its current component for rendering by the [`Reactor`](reactor.md) which is itself a
`Component` that will handle rendering our `Component` as its child.

## `tao` and `data` handler args combined as `props`

When the **adapted handler** receives the call from the TAO, it keeps track of the `tao` and `data`
args passed to it so they can be included as `props` for our instantiated `Component`.

However, since `props` is a single arg passed to the constructor of our `Component`, they have
to be combined.  Although technically it's the `Reactor` that is managing this, it's useful for
the explanation here in order to understand how other options to the `addComponentHandler` and
other methods on the `Adapter` will instantiate our `Component`s to help us in designing and
creating our `Component`s for use in this way.

The `tao` and `data` objects are **merged** to create the `props` on our `Component` so that we
at least end up with the following `props` passed to our `Component`:

* `t: string` - the `t` from the `tao` taople arg represents the Term
* `a: string` - the `a` from the `tao` taople arg represents the Action
* `o: string` - the `o` from the `tao` taople arg represents the Orient(ation)
* `[term]: any` _(optional)_ - the `[term]` _**key**_ is the value of `t` and the _**value**_ is the
  value of the data in the AppCon that is related to the Term (from `data` arg)
* `[action]: any` _(optional)_ - the `[action]` _**key**_ is the value of `a` and the _**value**_
  is the value of the data in the AppCon that is related to the Action (from `data` arg)
* `[orient]: any` _(optional)_ - the `[orient]` _**key**_ is the value of `o` and the _**value**_
  is the value of the data in the AppCon that is related to the Orient(ation) (from `data` arg)

## Clearing the `Component` on an AppCon

Sometimes we may want to explicitly clear the `Component` when an Application Context is set on
the TAO.  The `Adapter` allows us to set a "`Component` handler" for an empty component by passing
an empty or omitting the second argument to `addComponentHandler`:

```javascript
import MyComponent from './MyComponent';

const adapter = new Adapter(TAO);
adapter
  .addComponentHandler({ t: 'Space', a: 'View', o: 'Portal' }, MyComponent)
  .addComponentHandler({ t: 'Space', a: 'List', o: 'Portal' }, null)
  .addComponentHandler({ t: 'Space', a: 'Edit', o: 'Portal' }); // equivalent to above

TAO.setCtx({ t: 'Space', a: 'View', o: 'Portal' }, Space); // <-- MyComponent set is current for Adapter - rendered in any Reactor using the Adapter

TAO.setCtx({ t: 'Space', a: 'Edit', o: 'Portal' }, Space); // <-- null set as current for Adapter - any Reactor using this Adapter will render null children
```

## Removing a ComponentHandler

Just like you can remove a handler from the TAO, the `Adapter` allows you to remove a `Component`
handler by using `removeComponentHandler`.  Because you will generally not add a `Component`
handler with an anonymous inline function, it's likely you will easily have a reference to the
`Component`s constructor even if that reference is imported.

```javascript
import MyComponent from './MyComponent';

const adapter = new Adapter(TAO);
adapter.addComponentHandler({ t: 'Space', a: 'View', o: 'Portal' }, MyComponent);
…
// somehwere else
adapter.removeComponentHandler({ t: 'Space', a: 'View', o: 'Portal' }, MyComponent);
```

### Remove ALL ComponentHandler call

As a convenience, the `Adapter` allows you to remove all taoples attached to a `Component`
handler by passing an empty first argument to the `removeComponentHandler` method:

```javascript
import MyComponent from './MyComponent';

const adapter = new Adapter(TAO);
adapter
  .addComponentHandler({ t: 'Space', a: 'View', o: 'Portal' }, MyComponent)
  .addComponentHandler({ t: 'Space', a: 'View', o: 'Admin' }, MyComponent)
  .addComponentHandler({ t: 'Space', a: 'List', o: 'Portal' }, MyComponent)
  .addComponentHandler({ t: 'Space', a: 'List', o: 'Admin' }, MyComponent);
…
// somehwere else
adapter.removeComponentHandler({}, MyComponent); // <--- Adapter no longer has any handlers for MyComponent
// OR
adapter.removeComponentHandler(, MyComponent); // <--- Adapter no longer has any handlers for MyComponent
```

_**Special Note:** as an individual `Adapter` is managing the handler functions added to the TAO,
this way of removing handlers is scoped only to the individual `Adapter`._

## Succinct ComponentHandlers

The `Adapter` provides 2 mechanisms to reduce the verbosity when working with `Component` handlers.

### Matrixed taoples

Because we may want to use the same `Component` to handle several different Application Contexts,
the `Adapter` allows the taople values to be `Array`s to capture a matrix of taoples to handle
by our `Component`.  When using this mechanism, the `Adapter` will use the [ternary Cartesian Product](https://en.wikipedia.org/wiki/Cartesian_product#n-ary_Cartesian_product)
of all possibilities and add handlers to the TAO for each.

```javascript
import Form from './Form';

const adapter = new Adapter(TAO);
adapter.addComponentHandler({ term: 'Space', action: ['New', 'Edit'], orient: 'Portal' }, Form);

TAO.setCtx({ t: 'Space', a: 'New', o: 'Portal' }); // <-- shows Form with empty fields to create a new Space
TAO.setCtx({ t: 'Space', a: 'Edit', o: 'Portal' }, Space); // <-- shows Form to Edit the Space passed in 2nd arg
```

### Default Context

Because we will usually use a single `Adapter` to manage a set of `Component`s for our React App
in some area of similarity, the `Adapter` allows setting the default context used by an `Adapter`
to avoid repetitive setting of the same aspects when adding or removing `Component` handlers.

There are 2 ways to set the default context:

* `defaultCtx` setter property
* `setDefaultCtx` method which is fluent chainable by returning a reference to the `Adapter`  
  _you've seen this used in the [Intro to @tao.js React](README.md) examples_

Additionally, the `Adapter` has a getter property `defaultCtx` which returns a copy of the
value of the default context set by one of the methods above so that it cannot be modified outside
of the `Adapter`.

When using the default context, the `Adapter` will perform an `Object.assign` on the default
context and the specific taople used in the add or remove call so that taople aspects passed in
to the specific add or remove invocation will overwrite the default when determining the taople
that is of interest.  This applies to matrix taoples as well, and the cartesian product will be
determined **after** the merge has taken place.

We can use the defualt context to clean up examples from above:

```javascript
import View from './View';
import Form from './Form';

const adapter = new Adapter(TAO);
adapter
  .setDefaultCtx({ t: 'Space', o: 'Portal' })
  .addComponentHandler({ a: 'View' }, View)
  .addComponentHandler({ a: 'List' }, null)
  .addComponentHandler({ a: ['New', 'Edit'] , Form});

TAO.setCtx({ t: 'Space', a: 'View', o: 'Portal' }, Space); // <-- View set is current for Adapter - rendered in any Reactor using the Adapter

TAO.setCtx({ t: 'Space', a: 'New', o: 'Portal' }); // <-- shows Form with empty fields to create a new Space
TAO.setCtx({ t: 'Space', a: 'Edit', o: 'Portal' }, Space); // <-- shows Form to Edit the Space passed in 2nd arg

TAO.setCtx({ t: 'Space', a: 'List', o: 'Portal' }); // <-- null set as current for Adapter - any Reactor using this Adapter will render null children
```

## Additional `props`

The `Adapter` allows us to pass additional `props` that will be added to our `Component`s when
they are instantiated in the UI by the [`Reactor`](reactor.md).

To do this, we pass an `Object` with the desired `props` values in the third argument to
`addComponentHandler`:

```javascript
import Form from './Form';

const adapter = new Adapter(TAO);
adapter.addComponentHandler({ t: 'Space', a: ['New', 'Edit'], o: 'Portal' }, Form, {
  successCtx: { t: 'Space', a: 'Enter', o: 'Portal' }
});

TAO.setCtx({ t: 'Space', a: 'New', o: 'Portal' }); // <-- Reactor will render Form in UI with merged tao & data props + successCtx prop set above
```

### Addtional `props` specific to handler

Because we assign the additional `props` when adding the `Component` handler, the `props` assignment
we are making are particular to when that ComponentHandler is called.

We have 3 options to make them more general and not have to repeat them:

* Add `Component` handlers with [matrixed taoples](#matrixed-taoples)
* Use [default context](#default-context)
* Use the [`Reactor`'s additional `props`](reactor.md#additional-props) which only count for children
  rendered by that `Reactor` and **will not** be assigned for all `Component` handlers of our
  `Adapter` when more than one `Reactor` is used with the `Adapter`

_**Special Note:** it should be rather easy to add a `defaultProps` feature to `Adapter` allowing
this to have another option.  If that seems a need, we can do it._

