# Setting Application Contexts (AppCons)

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

## Setting Context

Signal a change in Application Context by using the `setCtx` method on the TAO:

```javascript
TAO.setCtx({ t: 'App', a: 'Enter', o: 'Portal' });
// OR
TAO.setCtx({ term: 'App', action: 'Enter', orient: 'Portal' });
```

## Include Data when Setting Context

You can also pass along data as the 2nd argument to the `setCtx` method on the TAO.

Data can be included in several different forms.

### 1. as an `Object` with properties of the same names as the trigram

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

_**Special Note:** not all properties from the trigram are required, the inclusion of
`Enter` and `Portal` are illustrative here_

### 2. as an `Object` with properties named `t` or `term`, `a` or `action`, and/or `o` or `orient`:

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
as properties using the names identified by the trigram_

### 3. as an `Array` ordered as `[term, action, orient]`

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

_**Special Note:** not all properties from the trigram are required, the inclusion of
all 3 entries is illustrative here_

## Create an `AppCon` and set Context

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

## Create an `AppCon` with data and set Context

Instantiating `AppCon`s with data is very similar to [passing data directly](#include-data-when-setting-context)
to the TAO's `setCtx` method by using the arguments **after** the first 3 args.

Like `setCtx`, the `AppCon` constructor offers several options.

### 1. as a single `Object` with properties of the same names as the trigram

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

### 2. as a single `Object` with properties named `t` or `term`, `a` or `action`, and/or `o` or `orient`

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

### 3. as an `Array` ordered as `[term, action, orient]`

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

_**Special Note:** not all properties from the trigram are required, the inclusion of
all 3 entries is illustrative here_

### 4. as a set of up to 3 args in series ordered as `term`, `action`, `orient`

```javascript
const appEnterPortal = new AppCon('App', 'Enter', 'Portal', { title: 'Patois - …' }, new Date(), { … });
…
TAO.setAppCtx(appEnterPortal);
```

**This Example** illustrates that data can be set for an `AppCon` that is not necessarily
itself an `Object` in the case of setting the `Enter` Action data to a `Date` value, and this is possible for any of the other forms of setting data above, not
just this form.

## `AppCon` instantiation has more to offer

You can also export `AppCon`s to be imported and used elswehwere in your app.

`AppCon` instantiation will also come in to play when we look at [Chaining AppCons](chaining.md).
