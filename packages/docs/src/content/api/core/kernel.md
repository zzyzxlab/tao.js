# Kernel API

**Package:** `@tao.js/core`

**Named Export:** `Kernel`

The Kernel is the base entry point of execution for `tao.js` apps.  Application Contexts are set on a
Kernel which then calls out to handlers which have been registered to trigrams that match the
Application Context.

## Methods

### `constructor`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`handlers`|no|`Map`||used for cloning a `Kernel` when instantiated - should change to another `Kernel`|
|`canSetWildcard`|no|boolean|`false`|set to true to allow the `Kernel` to accept wildcard AppCons to be set|

Used to construct a `Kernel` for use in an application.  Any app importing the `@tao.js/core` package
will have a default `Kernel` available as the default import from the package.

Use the `Kernel` constructor to instantiate additional `Kernel`s to have separated buses on which to
set AppCons.

### `setCtx`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|yes & no|`Object`||the trigram representing the Application Context being set|
|`data`|no|`Object` or `Array`||data associated with the Application Context being set|

If `canSetWildcard` is `false` for the Kernal (which is the default), then all `trigram` args that do
not specify all 3 values will be silently ignored.

`trigram` is an object with keys specifying which Application Context is being set:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

`data` is used to set a specific Application Context by specifying what the AppCon is being set for.
If not supplied as an arg, `data` will not be associated with the Application Context but an empty
object will always be used when calling the handlers to prevent having to check for `undefined`.

`data` follows the same rules as for the [`AppCtx`](appcon.md) constructor.
**Not true:** currently it only accepts being a single argument rather than a series of up to 3 -
this should be changed for consistency?

When called, `setCtx` calls all of the handlers attached to the Kernel that match the trigram of
the Application Context in the guaranteed [order of operations](../../advanced/order-of-handlers.md).

### `setAppCtx`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`appCtx`|yes|[`AppCtx`](appcon.md)||the Application Context being set|

If `canSetWildcard` is `false` for the Kernal (which is the default), then all `appCtx` args that do
not specify all 3 parts of a trigram will be silently ignored.

When called, `setCtx` calls all of the handlers attached to the Kernel that match the trigram of
the Application Context in the guaranteed [order of operations](../../advanced/order-of-handlers.md).

### `addInterceptHandler`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|no|`Object`|All wild trigram|the trigram matching Application Contexts that should be sent to this Intercept Handler|
|`handler`|yes|`function`||a handler function that will be called when an Application Context matching the `trigram` is set on the Kernel|

**returns:** `Kernel` - a reference to the Kernel that was called for chaining

`trigram` is an object with keys specifying which Application Contexts will be sent to the handler:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

If `trigram` is not provided, is empty, or does not have the correct keys, it will default to
Wildcard keys for the parts of the trigram that are missing.

Intercept Handlers have specific behavior defined in the [Advanced > Intercept Handlers](../../advanced/intercept-handlers.md)
section of the Guide.

### `addAsyncHandler`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|no|`Object`|All wild trigram|the trigram matching Application Contexts that should be sent to this Async Handler|
|`handler`|yes|`function`||a handler function that will be called when an Application Context matching the `trigram` is set on the Kernel|

**returns:** `Kernel` - a reference to the Kernel that was called for chaining

`trigram` is an object with keys specifying which Application Contexts will be sent to the handler:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

If `trigram` is not provided, is empty, or does not have the correct keys, it will default to
Wildcard keys for the parts of the trigram that are missing.

Async Handlers have specific behavior defined in the [Advanced > Async Handlers](../../advanced/async-handlers.md)
section of the Guide.

### `addInlineHandler`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|no|`Object`|All wild trigram|the trigram matching Application Contexts that should be sent to this Inline Handler|
|`handler`|yes|`function`||a handler function that will be called when an Application Context matching the `trigram` is set on the Kernel|

**returns:** `Kernel` - a reference to the Kernel that was called for chaining

`trigram` is an object with keys specifying which Application Contexts will be sent to the handler:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

If `trigram` is not provided, is empty, or does not have the correct keys, it will default to
Wildcard keys for the parts of the trigram that are missing.

Inline Handlers have specific behavior defined in the [Advanced > Inline Handlers](../../advanced/inline-handlers.md)
section of the Guide.

### `removeInterceptHandler`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|no|`Object`|All wild trigram|the trigram matching Application Contexts that should not be sent to this Intercept Handler|
|`handler`|yes|`function`||a handler function that has been attached to the Kernel|

**returns:** `Kernel` - a reference to the Kernel that was called for chaining

`trigram` is an object with keys specifying which Application Contexts this handler should no
longer receive:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

If `trigram` is not provided, is empty, or does not have the correct keys, it will default to
Wildcard keys for the parts of the trigram that are missing.

If the `handler` is not attached to the provided `trigram` then the request is silently ignored.

### `removeAsyncHandler`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|no|`Object`|All wild trigram|the trigram matching Application Contexts that should not be sent to this Async Handler|
|`handler`|yes|`function`||a handler function that has been attached to the Kernel|

**returns:** `Kernel` - a reference to the Kernel that was called for chaining

`trigram` is an object with keys specifying which Application Contexts this handler should no
longer receive:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

If `trigram` is not provided, is empty, or does not have the correct keys, it will default to
Wildcard keys for the parts of the trigram that are missing.

If the `handler` is not attached to the provided `trigram` then the request is silently ignored.

### `removeInlineHandler`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|no|`Object`|All wild trigram|the trigram matching Application Contexts that should not be sent to this Inline Handler|
|`handler`|yes|`function`||a handler function that has been attached to the Kernel|

**returns:** `Kernel` - a reference to the Kernel that was called for chaining

`trigram` is an object with keys specifying which Application Contexts this handler should no
longer receive:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

If `trigram` is not provided, is empty, or does not have the correct keys, it will default to
Wildcard keys for the parts of the trigram that are missing.

If the `handler` is not attached to the provided `trigram` then the request is silently ignored.

### `asPromiseHook`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`resolveOn`|yes & no|`Object` or `Array`||single or list of trigrams on which to resolve the `Promise`|
|`rejectOn`|yes & no|`Object` or `Array`||single or list of trigrams on which to reject the `Promise`|
|`timeoutMs`|no|number|`0`|a timeout in milliseconds after which the `Promise` should be rejected|

**returns:** a `setCtx` function that will return a `Promise` which will resolve or reject based
on the arguments provided.

At least one of either `resolveOn` or `rejectOn` **must** be provided to `asPromiseHook` or an
Error will be thrown.

`resolveOn` and `rejectOn` are trigrams of the same form used by the add and remove handler methods
of the Kernel, an object with keys specifying which Application Contexts this handler should no
longer receive:

- `t`/`term` - the term for the trigram
- `a`/`action` - the action for the trigram
- `o`/`orient` - the orient(ation) for the trigram

`asPromiseHook` adds Inline Handlers for each of the trigrams provided to it in the `resolveOn`
and `rejectOn` args and cleans up after itself by removing those handlers just before resolving or
rejecting the `Promise`.

`asPromiseHook` is late binding, meaning that it will add the handlers to the Kernel only after
the returned `setCtx` function is called so that the handlers aren't called/executed until
desired.
