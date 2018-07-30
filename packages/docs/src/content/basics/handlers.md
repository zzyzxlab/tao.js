# Handlers for AppCons

Now that we have a better understanding of defining Handlers for AppCons, we can look at how we
actually add handlers to the TAO in code.

## Handlers are just Functions

Handlers added to respond to the setting of an Application Context on the TAO are normal JavaScript
Functions with the following signature:

```javascript
function handlerForAppCon(tao, data) { … }
```

When called, every handler will **always** receive just the following 2 arguments.

### `tao: object` handler arg

The TAO will tell each handler which taople triggered the handler to be called.  The `tao` arg
is an `Object` with the following properties:

* `t: string` - the Term of the taople
* `a: string` - the Action of the taople
* `o: string` - the Orientation of the taople

These properties not only allow for your handler to know exactly why it was triggered, they are
useful for:

* having the `key`s to access the `data` object's child data
* allowing [Wilcard Handlers](wildcards.md) to know which taople triggered the handler to be called

### `data: object` handler arg

The TAO will pass the data used when the AppCon was triggered to all handlers that are registered
to handle the taople.

`data` will **always** receive an `Object`, even if it is empty (`{}`) so your handler can rely on
this and not have to worry about destructuring the `data` parameter against an `undefined` or `null`
arg.

`data` can have 0 - 3 `key`s defined on it depending on what was passed to the TAO when setting
the context to the specific Application Context that triggered the call to your handler.

Each `key` in `data` will be set as the concrete taople available from the [`tao` arg](#tao-handler-arg),
e.g. if the taople is `{ t: 'App', a: 'Enter', o: 'Portal' }` then `data` _can contain_ the
`key`s `'App'`, `'Enter'` and `'Portal'` depending on which aspect was provided data when the
Application Context was set on the TAO.

`data` will **always** have this :point_up_2: structure no matter which form is used to pass data
on setting Application Context, including [data args to `setCtx`](app-cons.md#include-data-when-setting-context)
or [data args to `AppCon` constructor](app-cons.md#create-an-appcon-with-data-and-set-context).
This behavior is specifically by design to allow for multiple ways of setting the data while
providing a consistent and reliable API for creating your Handlers.

`data` will be the same reference for all handlers called so take care not to manipulate the
object your handler receives, rather make a new object if you want to make changes.

## Adding Handlers for AppCons

The TAO provides 3 different types of Handlers which you can see in the [Advanced Section](../advanced/README.md).  For learning the Basics here, we will illustrate use with the most widely
used and easiest to understand Handlers, called Inline Handlers.

To add a handler for an AppCon, first make sure you've imported the TAO in the file you intend to
add the handler from:

```javascript
import TAO from '@tao.js/core';
```
OR
```javascript
const TAO = require('@tao.js/core');
```

Handlers are added **directly** on the TAO by using one of the `add[Type]Handler(…)` methods and
passing the following 2 arguments:

* `taople: object` - the taople your handler cares about
  * can take either short form `key`s (`{ t, a, o }`) or
  * long form `key`s (`{ term, action, orient }`).
* `handler: function` - function you want to be called when an AppCon matching the given taople is set on the TAO

```javascript
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, (tao, data) => {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
});
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, (tao, data) => {
  console.log(`Look, Ma! We entered the App ${data[tao.t]title}`);
});
```

### Handler Function Return Value

The TAO only cares about the Return Value of a Handler in 2 cases which are described in further
detail in other sections:

* an `AppCon` as the return value is used for [Chaining AppCons](chaining.md)
* an truthy or falsey return values from an [Intercept Handler](../advanced/intercept-handlers.md)

All other return values are ignored so you can potentially use the same function as a handler
for the TAO as well as in other areas of your application.  It's up to you.

_**Special Note:** with Decorators on the [Roadmap](../intro/roadmap) we may allow automating
the setting of return values into an `AppCon`._

## Arrow Functions vs Other Functions

To the TAO, the handler is a `Function` and it doesn't care what form that function came to it
as.  We used an arrow function above to illustrate a common case, but the following
are all equivalent and will achieve the same result when it comes to handling AppCons.

If this is obvious to you and you needn't bother then skip ahead to [Async Function Handlers](#async-function-handlers) below.

### Arrow Function as `const` definition

```javascript
const handleAppEnterPortal = (tao, data) => {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
};

TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, handleAppEnterPortal);
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, handleAppEnterPortal);
```

### `Function` declaration

```javascript
function handleAppEnterPortal(tao, data) => {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
};

TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, handleAppEnterPortal);
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, handleAppEnterPortal);
```

### Inline Anonymous `Function` declaration

```javascript
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, function (tao, data) {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
});
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, function (tao, data) {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
});
```

### Inline Named `Function` declaration

```javascript
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, function handleAppEnterPortal(tao, data) {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
});
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, function handleAppEnterPortal(tao, data) {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
});
```

### Function as `class` member

Here is an example of adding a method from an `Object` of type `MyClass` as a handler:

```javascript
class MyClass {
  constructor(stuff) {
    doStuff(stuff);
  }

  handleAppCon(tao, data) {
    console.log('Handling AppCon for:', tao, 'with:', data);
  }
}

// Add Object method as handler
const myObject = new MyClass();
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, myObject.handleAppCon);
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, myObject.handleAppCon);
```

Here is an example of adding a method from an `Object` of type `MyClass` that is bound in the
constructor so the handler will have access to the `this` reference for the object:

```javascript
class MyClass {
  constructor(stuff) {
    doStuff(stuff);
    this.handleAppConWithThis = handleAppConWithThis.bind(this);
  }

  handleAppConWithThis(tao, data) {
    // b/c of the constructor, handler has access to `this` of Object when called
    console.log('Handling AppCon for:', tao, 'with:', data);
    this.doSomething(data);
  }
}

// Add Object public method as handler
const myObject = new MyClass();
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, myObject.handleAppConWithThis);
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, myObject.handleAppConWithThis);
```

An alternate version using the [Class Fields Proposal (Stage 3)](https://tc39.github.io/proposal-class-fields/)
to declare a Public Class Method which is properly bound to the `Object` instance so it has
access to the object's `this` within the handler:

```javascript
class MyClass {
  constructor(stuff) {
    doStuff(stuff);
  }

  handleAppConWithThis = (tao, data) {
    // b/c of Public Method syntax (proposal), handler has access to `this` of Object when called
    console.log('Handling AppCon for:', tao, 'with:', data);
    this.doSomething(data);
  }
}

// Add Object public method as handler
const myObject = new MyClass();
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, myObject.handleAppConWithThis);
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, myObject.handleAppConWithThis);
```

Here is adding a `static` method from `MyClass` as a handler:

```javascript
class MyClass {
  constructor(stuff) {
    doStuff(stuff);
  }

  static handleAppConStatic(tao, data) {
    console.log('Handle everybody bidness for:', tao, 'with:', data);
  }
}

// Add Class Static method as handler
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, MyClass.handleAppConStatic);
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, MyClass.handleAppConStatic);
```

## Async Function Handlers

Because a lot of what is done in JavaScript relies on asynchronous operation, the TAO allows
you to add `async` functions or functions that return a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
as handlers for Application Contexts.

These will have different behavior depending on the Type of Handler you add, but in the Basic
case outlined here (using [Inline Handlers](../advanced/inline-handlers.md)), the TAO will
`await` for your handler to fully complete (resolve or reject) before moving onto the next handler.

There is **no difference** in the way the TAO operates between an `async` function versus a fuction
that just returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

## Handlers throwing Errors

If the handler added to the TAO throws an `Error`, it will not be caught.  It's suggested
that your handlers catch `Error`s and handle them by [setting the Application Context](setting-app-cons.md#setting-context)
to something signaling the `Error` like using `action: 'Fail'`.

## Removing Handlers

Because we can add new handlers at any point in the lifecycle of our app, the TAO allows for
dynamic loading and unloading of handlers in response to any events, namely but not limited
to Application Contexts or if used with [Code Splitting](https://webpack.js.org/guides/code-splitting/).

If you want to remove a handler from the TAO, you will _**need to keep a reference**_ to it somewhere
that is accessible to the code that will remove it from the TAO.

To remove a handler, make sure you are removing the handler using the same type that you used
to add the handler function, using the corollary `remove[Type]Handler` method to the `add[Type]Handler`.

```javascript
const handleAppEnterPortal = (tao, data) => {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
};

// add the handler
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, handleAppEnterPortal);
// OR
TAO.addInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, handleAppEnterPortal);

…
// Somwhere else

// remove the handler
TAO.removeInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, handleAppEnterPortal);
// OR
TAO.removeInlineHandler({ term: 'App', action: 'Enter', orient: 'Portal' }, handleAppEnterPortal);
```

**Named Function Definitions** are [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
so they can be defined inline and referenced elsewhere, e.g.:

```javascript
// add the handler
TAO.addInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, function handleAppEnterPortal(tao, data) => {
  console.log(`Look, Ma! We entered the App ${data.App.title}`);
});
…
// Somwhere in same file

// remove the handler
TAO.removeInlineHandler({ t: 'App', a: 'Enter', o: 'Portal' }, handleAppEnterPortal);
```

### Missing Handler

When attempting to remove a handler from the TAO, if either the handler is not registered for the
taople you specify or the taople you specify doesn't have any handlers then the request is
simply ignored.

## The Decorators Spec

It's expected soon the Decorators Spec will be approved and made part of JavaScript.  With that
coming, it makes perfect sense to allow using decorators to wire up handlers for you, so expect
this to come in the future [roadmap](../intro/roadmap.md).

Several reasons why it's not implemented already:

* Just trying to get this in people's hands to get feedback first - waiting for a decorators
  implementation would have made it easier to adopt, but also take longer
* React.js originally had an implementation of Decorators that they had to rip out once the
  nascient spec was not approved to be added to the language.  I made the decision then not
  to implement my React apps using Decorators and it paid off by not having to go back and
  change my implementation, so it's easier to be patient here.
