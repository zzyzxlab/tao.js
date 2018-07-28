# Wildcard Handlers

One of the principle [Motivations](../intro/motivations.md) behind
the TAO is to build Systems and Applications that are fundamentally
designed to _Evolve_ by using the concepts behind
[Aspect-Oriented Programming (AOP)](https://en.wikipedia.org/wiki/Aspect-oriented_programming).

Most implementations of AOP use something to inject code

Wildcard Handlers allow us to add handlers to the TAO that are called
when any of the Concrete taople aspects match the Application Context
set on the TAO.

This is one feature that sets tao.js apart from any other Event-driven
mechanisms by allowing a Subscriber (handler) to subscribe to
Events (AppCons) of any kind along a specific axis or axes (or none)
in order to react over a broad spectrum of similar Events.

Wildcard Handlers can choose to focus on a specific Term, Action,
or Orientation or some subset of those 3 or none at all.

## Wildcard vs Concrete

Concrete taople aspects are specifically named Terms, Actions or
Orientations.  They are called "Concrete" in that they are set and
do not change to be something else.

For example: in `{App,Enter,Portal}`, the entire taople is
considered a Concrete Application Context because it specifically
defines each aspect of the taople for the Application Context.
Each specifically defined aspect of the taople is itself a Concrete
Aspect, in this case a Concrete Term, Concrete Action and Concrete
Orient(ation).

Wildcard taoples are those that leave one or more of the taople
aspects undefined or "not Concrete."

## What Wildcard taoples look like

Wildcard taoples can be defined in various different ways, the
majority of which is to simply leave the taople property out.

Example basic Wildcard taoples:

```javascript
{ t: 'App', o: 'Portal' } // Action is left Wild
{ t: 'App' } // Action and Orient are left wild
{} // All 3 Aspects (Term, Action & Orient) are left wild
```

You can also use empty strings (`''`) or asterisks (`*`) to
define Wild taople aspects.

_support for asterisks (`*`) is due to that is a generalized
way to describe Wildcard taoples when describing the software
to be written using the TAO_

Examples:

```javascript
{ t: 'App', a: '', o: 'Portal' } // Action is defined Wild
{ t: 'App', a: '*', o: '*' } // Action and Orient are defined wild
{ a: '', o: '*' } // All 3 Aspects are Wild, and the style is mixed
```

## Adding a Wildcard Handler

Adding a Wildcard Handler to the TAO is the same as adding a Concrete
Handler to the TAO.

### Wildcard Handler for all AppCons on a Term

```javascript
const handleApp = (tao, data) => {
  console.log(`Look, Ma! We see everything fired on the App! - this one is doing ${tao.a} from ${tao.o}`);
};

TAO.addInlineHandler({ t: 'App' }, handleApp);
// OR
TAO.addInlineHandler({ term: 'App', action: '*', orient: '*' }, handleApp);
```

_**Special Note:** there is no distinction between the 2 above, the second only includes the
other 2 taople aspects for illustrative purposes._

### Wilcard Handler for all AppCons of an Action

```javascript
const handleViews = (tao, data) => {
  console.log(`Look, Ma! We react to every View! - this one is viewing: ${tao.t} from ${tao.o}`);
};

TAO.addInlineHandler({ a: 'View' }, handleViews);
// OR
TAO.addInlineHandler({ term: '', action: 'View', orient: '' }, handleViews);
```

### Wilcard Handler for all AppCons of an Orient(ation)

```javascript
const handlePortal = (tao, data) => {
  console.log(`Look, Ma! We react to everything from Portal! - this one is on: ${tao.t} doing ${tao.a}`);
};

TAO.addInlineHandler({ o: 'Portal' }, handlePortal);
// OR
TAO.addInlineHandler({ term: '*', action: '*', orient: 'Portal' }, handlePortal);
```

### Wildcard Handler for ALL AppCons

```javascript
const handleAll = (tao, data) => {
  console.log(`Look, Ma! We react to everything! - this one is on: ${tao.t} doing ${tao.a} from ${tao.o}`);
};

TAO.addInlineHandler({}, handleAll);
// OR
TAO.addInlineHandler({ term: '*', action: '*', orient: '*' }, handleAll);
```
