# [Original API] Adapter API

**Package:** `@tao.js/react`

**Named Export:** `Adapter`

Used to adapt regular React `Component`s (which can also be Functional Components) to act as
handlers on the TAO.

Use an `Adapter` in conjunction with a [`Reactor`](reactor.md) to get those React `Component`s
into the DOM tree.

## Methods

### constructor

|arg|required|type|default|description|
|---|---|---|---|---|
|`TAO`|yes|Kernel||set the [`Kernel`](../core/kernel.md) that the Adapter will connect handlers to|

Use the `Adapter` constructor to create a way to adapt a set of React Components to act as
handlers.

### `setDefaultCtx`

|arg|required|type|default|description|
|---|---|---|---|---|
|`trigram`|no|Object|empty Object|default trigram attributes when adding handlers|

**returns:** `Adapter` - a reference to the Adapter that was called for chaining

Use `setDefaultCtx` to set the default trigram attributes when adding Component Handlers to the
`Adapter` so that the same trigram attributes don't have to be repeated.

Calling `setDefaultCtx` repeatedly will change the default trigram attributes used.  Changing
the default context will only affect Component Handlers added after `setDefaultCtx` was called.

Calling `setDefaultCtx` with no arguments or an empty `Object`

### `addComponentHandler`

|arg|required|type|default|description|
|---|---|---|---|---|
|`trigram`|no|Object|empty Object|a trigram used for adding the Component Handler to the TAO|
|`ComponentHandler`|yes|`Component` or `Function`||a React Component or function that will be treated as a React Component that will respond to Application Contexts when set on the TAO|
|`prop`|no|Object||additional props to be added to the Component when the handler is triggered by the TAO|

**returns:** `Adapter` - a reference to the Adapter that was called for chaining

`trigram` can specify all or none of the trigram attributes.

`trigram` can specify a single value for a trigram attribute or multiple values using an `Array`.
When an `Array` is specified for any of the trigram attributes, then all permutations will be
determined and used to add the handler to the TAO Kernel.

When the handler is added to the TAO Kernel the `trigram` provided will be merged with the
[`defaultCtx`](#defaultctx) property to determine the set of trigrams permutations that will
trigger the handler.

### `removeComponentHandler`

|arg|required|type|default|description|
|---|---|---|---|---|
|`trigram`|no|Object|empty Object|a trigram used for removing the Component Handler from the TAO|
|`ComponentHandler`|yes|`Component` or `Function`||a React Component or function that will be treated as a React Component that will no longer respond to Application Contexts when set on the TAO|

**returns:** `Adapter` - a reference to the Adapter that was called for chaining

`trigram` can specify all or none of the trigram attributes.

When `trigram` has no attributes specified, `removeComponentHandler` will remove the Component
Handler from all trigrams on the TAO Kernel.

`trigram` can specify a single value for a trigram attribute or multiple values using an `Array`.
When an `Array` is specified for any of the trigram attributes, then all permutations will be
determined and used to remove the handler from the TAO Kernel.

When the handler is removed from the TAO Kernel the `trigram` provided will be merged with the
[`defaultCtx`](#defaultctx) property to determine the set of trigrams permutations that will
specify which handlers to remove.

## Properties

### `defaultCtx`

Sets or returns the default context trigram attributes used when adding Component Handlers to the
`Adapter`.

The property is defined in a way that mutating the return value will not mutate the internal state
of `Adapter`.  The only way to change the state of `defaultCtx` used by the `Adapter` is by
assigning to the `defaultCtx` prop or by calling [`setDefaultCtx`](#setdefaultctx) defined above.
