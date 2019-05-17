# tao.js Reactor for React

_This is a description for part of the first ("original") API for integrating the TAO with React.
For a description of the Current API which provides a more React-like declarative approach,
take a look [here](../README.md)._

Now that we know how to use [`Adapter`](adapter.md)s to use our React `Component`s as handlers for
Application Contexts in the TAO, we need to learn how to render them in the UI.

`@tao.js/react` provides the `Reactor` `Component` to accomplish this by working with the `Adapter`s
we create.

## Not much here to see

`Reactor` components are specifically designed to be simple to use dumb container components that
will render whatever is determined by the TAO via the `Adapter` to which it is attached.

To use a `Reactor` we will need to import it as well as have access to (or import and create) an
`Adapter`.  It's usual to create them together, allowing all of our other `Component` definitions
used by the `Adapter` to be isolated and defined on their own where they can be regular React
`Component`s without any knowledge of either the `Adapter` or `Reactor`.

Here's an example of creating and setting up an `Adapter` and then attaching a `Reactor` to it:

```javascript
import React from 'react';
import TAO from '@tao.js/core';
import { Adapter, Reactor } from '@tao.js/react';
// import child components that will be handlers
import List from './List';
import View from './View';
import Form from './Form';

const spaceAdapter = new Adapter(TAO);
spaceAdapter
  .setDefaultCtx({ term: 'Space', orient: 'Portal' })
  .addComponentHandler({ action: 'List' }, List)
  .addComponentHandler({ action: 'View' }, View)
  .addComponentHandler({ action: ['New', 'Edit'] }, Form);

const SpaceContainer = () => (
  <div>
    <Reactor adapter={spaceAdapter} />
  </div>
);

export default SpaceContainer;
```

## `adapter` is required

The `adapter` prop on the `Reactor` component is **required** and **must** be of type `Adapter`.

It's possible to make an interface out of this and allow more flexiblity but we don't see the point
right now.

## More details

When a `Reactor` is created, it first registers itself with the `adapter` defined in it's `props` to
be notified when the `Adapter`'s adapted handlers have been called by the TAO so that the `Reactor`
can trigger React to render itself, specifically its child `Component`.

The child `Component` of a `Reactor` is the component that is currently set for the `Adapter`.  This
is why we won't have a single global `Adapter` like we do for the TAO, rather each `Adapter` is
acting as a publisher for any `Reactor`s that care to subscribe for components.

### `adapter` is a prop

Because `adapter` is a prop to the `Reactor`, it is possible to change the `adapter` on the fly.

Although the `Reactor` is written to be simple, it's not so dumb as we make it.  If you do change
the `adapter` prop, it will check to see if it is different before unregistering from the previous
and registering with the new `Adapter`s for updates.

Additionally, when the `Reactor` is unmounted, it will unregister itself so as not to receive
more updates from the `Adapter`, allowing it to be garbage collected having no references leaking.

### `children` are ignored

The `Reactor` is designed to render child `Component`s based on what Application Contexts are set
on the TAO via the `Adapter` to which it is attached.  Currently, any child `Component`s of a
`Reactor` will be ignored and not rendered as part of the UI.

```javascript
export function MyContainer() {
  return (
    <div>
      <Reactor adapter={myAdapter}>
        {/* everything below is ignored */}
        <MyOtherComponent theme="myTheme" data={stuff} />
        <MyOtherContainer>
          <ChildLikeDemeanor />
        </MyOtherContainer>
      </Reactor>
    </div>
  )
}
```

If it makes sense, this _could_ be revisited in the future.

### Additional `props`

Just like the [`Adapter`'s additional `props`](adapter.md#additional-props), `Reactor`s can be
given `props` beyond the required `adapter` to make it work.

```javascript
export function MyContainer() {
  return (
    <div>
      <Reactor adapter={myAdapter} theme="myTheme" user={currentUser} />
    </div>
  )
}
```

`Adapter`'s additional `props` are assigned when the `Component` handler is added, so the `props`
become default for **a particular** `Component` when a **particular** AppCon is set on the TAO.

This differs from `Reactor` additional `props` in that whatever is set on the `Reactor` `Component`
as `props` will be passed down to the instantiated child `Component`.

Think of `Reactor` additional `props` as global to the possible children of the `Reactor`.

**If there is conflict** and a `prop` is defined for both a `Reactor` and `Adapter`'s `Component`
handler, the `Component` handler's prop coming from the `Adapter` will take precedence and be used
to set the value of the prop on the child `Component`.

_**Special Note:** because these additional `props` are set on the `Reactor` and **not** the
`Adapter` and that `Reactor`s attach themselves to their `adapter`s, the `Adapter` has no knowledge
and never sees the additional `props` coming from a `Reactor`._
