# `@tao.js/react` SwitchHandler

An additional React `Component` used to integrate the TAO with the components used to generate the
view of our React app is the `SwitchHandler`.

_(all of the description below assumes a single `Provider` at the root of our React App)_
_(please see the [`Provider`](provider.md#advanced-usage) doc page for more about advanced usage)_

The `SwitchHandler` _is a_ React `Component` **and a** TAO handler attached to listen for AppCons
matching the configured Trigrams of its `RenderHandler` children.

Because the `RenderHandler` is designed to listen only for AppCons to which it is configured, it is
not aware of the other AppCons being set in the TAO.  In order to control and determine when to
include or exclude individual `RenderHandler`s within a set that each attach to different Trigrams,
we surround them with a `SwitchHandler`.

## importing

`SwitchHandler` is a named export from the `@tao.js/react` package.

```javascript
import { SwitchHandler } from '@tao.js/react';
```

OR

```javascript
const SwitchHandler = require('@tao.js/react').SwitchHandler;
```

## Exclusivity Control of `RenderHandler`s

The `SwitchHandler` is different from the `RenderHandler` in that it does not take a [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
to define the TAO handler it uses to attach to the TAO.  The `SwitchHandler` defines its own TAO
handler and attaches it for every Trigram it finds in direct child (no descendants are searched)
`RenderHandler`s.

```javascript
…
import {
  SwitchHandler,
  RenderHandler,
} from '@tao.js/react';
import List from './List';
import View from './View';
import Form from './Form';

…

const SpaceContainer = props => (
  {/* surround RenderHandlers with a SwitchHandler */}
  <SwitchHandler>
    <RenderHandler term="Space" action="List" orient="Portal">
      {(tao, data) => <List data={data.Space} />}
    </RenderHandler>
    <RenderHandler term="Space" action="View" orient="Portal">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
    <RenderHandler term="Space" action="Edit" orient="Portal">
      {() => <div>You must save for changes to take effect.</div>}
    </RenderHandler>
    <RenderHandler term="Space" action={['New', 'Edit']} orient="Portal">
      {(tao, data) => <Form Space={data.Space} editing={tao.a === 'Edit'} />}
    </RenderHandler>
    <RenderHandler term="Space" action="View" orient="Portal">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
  </SwitchHandler>
);

export default SpaceContainer;
```

The example `SwitchHandler` above will attach its handler to the TAO for the following Trigrams:

* `{Space,List,Portal}`
* `{Space,View,Portal}`
* `{Space,Edit,Portal}`
* `{Space,New,Portal}`

## Convenience Trigram props

As we can see in the example above, many times several `RenderHandler`s will be grouped together
and use the same `term`, `action` and/or `orient` Trigram props in the case when we want to use
a `SwitchHandler` to decide which to render.

As a convenience, the `SwitchHandler` will accept `term`, `action` and/or `orient` props that will
be used as default values for its `RenderHandler` children.  When doing this, the following 2
behaviors will occur from the `SwitchHandler`:

* the props will be combined with the same props from each child `RenderHandler` individually,
  giving precedence to the `RenderHandler`'s prop value, to determine the trigrams that the
  `SwitchHandler`'s handler will be attached to the TAO
* the props will be combined with the same props from each child `RenderHandler` individually,
  giving precedence to the `RenderHandler`'s prop value, to set the trigram props on the
  `RenderHandler` that is added to the component render tree so the actual `RenderHandler`s in
  the shadow DOM will have the same values used for attaching their TAO handler

We can modify the above example using this:

```javascript
…
import {
  SwitchHandler,
  RenderHandler,
} from '@tao.js/react';
import List from './List';
import View from './View';
import Form from './Form';

…

const SpaceContainer = props => (
  {/* use convenient default trigram prop values for term & orient */}
  <SwitchHandler term="Space" orient="Portal">
    {/* will receive term="Space" action="List" orient="Portal" props when rendered to the tree */}
    <RenderHandler action="List">
      {(tao, data) => <List data={data.Space} />}
    </RenderHandler>
    <RenderHandler action="View">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
    <RenderHandler action="Edit">
      {() => <div>You must save for changes to take effect.</div>}
    </RenderHandler>
    <RenderHandler action={['New', 'Edit']}>
      {(tao, data) => <Form Space={data.Space} editing={tao.a === 'Edit'} />}
    </RenderHandler>
    <RenderHandler action="View">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
  </SwitchHandler>
);

export default SpaceContainer;
```

Both above examples will have the **exact same** output where we have a more convenient and
declaratively documented way to express our UI in the example directly above.

### Overriding default trigram prop

If we further extend the example above to:

```javascript
const SpaceContainer = props => (
  {/* use convenient default trigram prop values for term & orient */}
  <SwitchHandler term="Space" orient="Portal">
    {/* will receive term="Space" action="List" orient="Reporting" props when rendered to the tree */}
    <RenderHandler action="View" orient="Reporting">
      {(tao, data) => <SpaceReport data={data.Space} />}
    </RenderHandler>
    <RenderHandler action="List">
      {(tao, data) => <List data={data.Space} />}
    </RenderHandler>
    <RenderHandler action="View">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
    <RenderHandler action="Edit">
      {() => <div>You must save for changes to take effect.</div>}
    </RenderHandler>
    <RenderHandler action={['New', 'Edit']}>
      {(tao, data) => <Form Space={data.Space} editing={tao.a === 'Edit'} />}
    </RenderHandler>
    <RenderHandler action="View">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
  </SwitchHandler>
);
```

The `RenderHandler` that defines `orient="Reporting"` will have the orient value `"Reporting"` for
both the `SwitchHandler` trigram related to it and receiving props when added to the render tree.

### Defining Multiple Trigrams

Just like with a standard TAO handler, it's possible to use wildcard definitions for the Trigram
of our `SwitchHandler`.  This is done by either ommitting the Trigram prop for the desired wildcard
or by providing an empty string (`""`) as the prop value.

Additionally, as a convenience provided in the `@tao.js/react` package, all components can specify
multiple values for any Trigram prop to capture more than one **specific** AppCon (remember, a
wildcard will match any).  This is done using an `Array` of values for the prop, e.g.:

```javascript
<SwitchHandler term={['User', 'Role']} orient="Portal">
```

When a Trigram prop on a `SwitchHandler` has more than one value, **after combining and overriding**
trigram props from a child `RenderHandler`, the `SwitchHandler` will calculate the cartesian product
to determine all of the trigrams to which the `SwitchHandler`'s handler should be attached.

If a child `RenderHandler` does not specify the trigram prop that is defined on the `SwitchHandler`
with multiple values then the `RenderHandler` will receive that prop with a definition of multiple
values thus the `RenderHandler` will perform the same cartesian product when determining trigrams
for its own handler as documented on the [`RenderHandler` doc page](render-handler.md#defining-multiple-trigrams).
