# RenderHandler API

**Package:** `@tao.js/react`

**Named Export:** `RenderHandler`

A React `Component` that _is a_ TAO handler listening for AppCons to render its children to the
component tree.

## Properties

|name|required|type|default|description|
|---|---|---|---|
|`term`|no|string or string[]||defines a term or terms for the trigram the handler will subscribe|
|`action`|no|string or string[]||defines a action or actions for the trigram the handler will subscribe|
|`orient`|no|string or string[]||defines a orient(ation) or orient(ation)s for the trigram the handler will subscribe|
|`context`|no|string||which key from the shared data context will be consumed and provided as the third arg to the handler|
|||string[]||which keys from the shared data context will be consumed and provided as additional args to the handler in the order they're specified in the array|
|`shouldRender`|no|bool|`false`|whether the child handler function is called by default before a matching AppCon has been set in the TAO|

## Children

_**Children are required**_

`RenderHandler` makes use of a React pattern called [function as a child](https://reactjs.org/docs/render-props.html#using-props-other-than-render)
to literally make us of a TAO handler to be the child of the `RenderHandler` which will have the same
behavior as a TAO handler in that it will be called **only when** an AppCon matching the trigram(s)
defined using the trigram props (above) has been set on the TAO [`Kernel`](../core/kernel.md) from
the closest ancestor [`Provider`](provider.md).

**This means** that the `RenderHandler`'s children will only be added to the component tree once a
desired AppCon has been set in the TAO.

This **also means** that once the `RenderHandler`'s child handler function has been called and the
return has been added to the component tree, they will remain until either:

* the `RenderHandler` is unmounted
  OR
* another matching AppCon is set on the TAO triggering a call the handler child function

This leads to `RenderHandler` children remaining in the component tree while other non-matching
AppCons are set on the TAO.

### `shouldRender` override

The default behavior of a `RenderHandler` not rendering its children to the component tree can be
overridden by setting the `shouldRender` prop to `true`.

## Example

It's advisable but not required to create regular React `Component`s as would be normal for any other
React app, and wrap those components using `RenderHandler`s to pass data and decide when they should
be added to the render tree.

Taken from the [React Integration Guide](../../client-react/README.md), below we are exporting a
component from an `index.js` file as a container that wraps the other components within the same
folder and uses `RenderHandler`s to determine when each component is added to the render tree and
how to get the proper data to them.

### `src/components/space/index.js`

```javascript
import React, { Fragment } from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import {
  RenderHandler,
} from '@tao.js/react';
import List from './List';
import View from './View';
import Form from './Form';

// chain entering a Space with showing the View
TAO.addInlineHandler(
  { t: 'Space', a: 'Enter', o: 'Portal' },
  (tao, { Space }) => {
    return new AppCtx('Space', 'View', 'Portal', { Space });
  }
);

const SpaceContainer = props => (
  <Fragment>
    <h2 class="title">Spaces</h2>
    <RenderHandler term="Space" action="List" orient="Portal">
      {(tao, data) => <List data={data.Space} />}
    </RenderHandler>
    <RenderHandler term="Space" action="View" orient="Portal">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
    <RenderHandler term="Space" action="Edit" orient="Portal">
      {() => <div>You must save for changes to take effect.</div>}
    </RenderHandler>
    <RenderHandler term="Space" action={['New', 'Edit'] orient="Portal"}>
      {(tao, data) => <Form Space={data.Space} editing={tao.a === 'Edit'} />}
    </RenderHandler>
    <RenderHandler term="Space" action="View" orient="Portal">
      {(tao, data) => <View Space={data.Space} />}
    </RenderHandler>
  </Fragment>
);

export default SpaceContainer;
```

