# AppCtx API

**Package:** `@tao.js/core`

**Named Export:** `AppCtx`

`AppCtx`s represent Application Contexts explicitly in a TAO application.  Additionally, `AppCtx`s
are returned by handlers when the handler needs to trigger a change in Application Context.  This is
known as [Chaining](../../basics/chaining.md) and is a very important part of TAO programming.

## Methods

### `constructor`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`term`|no|string|wild|the term defining the Application Context|
|`action`|no|string|wild|the action defining the Application Context|
|`orient`|no|string|wild|the orient defining the Application Context|
|`...data`|no|multiple||the data defining the Application Context|

`term`, `action`, and `orient` args are used to set the trigram attributes for this AppCtx
representing a specific Application Context in your app.

`data` is used to set the specific nature of the Application Context represented by the AppCtx
with several options for passing the data to the constructor:

1. as an `Object` with keys of the same names as the trigram
2. as an `Object` with properties named `t` or `term`, `a` or `action`, and/or `o` or `orient`
3. as an `Array` ordered as `[term, action, orient]`
4. as a set of up to 3 args in series ordered as `term`, `action`, `orient`

For examples see the [Setting Application Contexts (AppCons)](../../basic/setting-app-cons.md#create-an-appcon-with-data-and-set-context)

### `unwrapCtx`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`verbose`|no|bool|`false`|whether to use full words for the trigram keys or not|

**returns:** trigram `Object`

Use `unwrapCtx` to get a plain JavaScript `Object` with trigram keys for this AppCtx.

By default, `unwrapCtx` will return an `Object` with keys of `t`, `a`, and `o` with the values for
each of the attributes of the trigram represented by the Application Context.

Specifying `verbose` as `true` will return an `Object` with keys of `term`, `action`, and `orient`
instead of the default `t`, `a`, and `o` keys.

### `isMatch`

|arg|required|type|default|description|
|---|--------|----|-------|-----------|
|`trigram`|no|`Object` or `AppCtx`||another trigram to compare to this AppCtx|
|`exact`|no|bool|`false`|whether to match only exact trigrams or allow wildcards to match anything|

**returns:** bool

`isMatch` can take another `AppCtx` or an `Object` with trigram keys (`t`/`term`, `a`/`action`,
and `o`/`orient`) and check it against the `AppCtx` on which `isMatch` is called.

By default, `isMatch` allows wildcard trigram attributes to match anything on either side of the
match.

Specifying `exact` as `true` means that the AppCtx must match the provided `trigram` arg exactly
on all 3 trigram attributes.

## Properties

### `t`

_read only_   
**type:** String

Returns the value of the term for the AppCtx

### `a`

_read only_   
**type:** String

Returns the value of the action for the AppCtx

### `o`

_read only_   
**type:** String

Returns the value of the orient for the AppCtx

### `isTermWild`

_read only_   
**type:** bool

Returns `true` if the term of the AppCtx is a wildcard term, `false` otherwise

### `isActionWild`

_read only_   
**type:** bool

Returns `true` if the action of the AppCtx is a wildcard term, `false` otherwise

### `isOrientWild`

_read only_   
**type:** bool

Returns `true` if the orient of the AppCtx is a wildcard term, `false` otherwise

### `isWildcard`

_read only_   
**type:** bool

Returns `true` if any of the trigram attributes of the AppCtx are wildcard, `false` otherwise

### `isConcrete`

_read only_   
**type:** bool

Returns `true` if none of the trigram attributes of the AppCtx are wildcard, `false` otherwise

### `data`

_read only_   
**type:** Object

Returns the data portion of the AppCtx reflecting a specific Application Context for the
trigram representation.

`data` will _always_ return an Object, even if it is empty so there is no need to check for
`null` or `undefined`.

The Object returned will have keys that match the trigram attribute values.
