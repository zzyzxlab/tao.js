# SwitchHandler API

**Package:** `@tao.js/react`

**Named Export:** `SwitchHandler`

A React `Component` that _is a_ TAO handler listening for AppCons to control whether `RenderHandler`
direct children will be added to the component tree.

## Properties

|name|required|type|default|description|
|---|---|---|---|
|`term`|no|string or string[]||defines a default term or terms passed to child [`RenderHandler`s](render-handler.md) as `term` prop|
|`action`|no|string or string[]||defines a default action or actions passed to child [`RenderHandler`s](render-handler.md) as `term` prop|
|`orient`|no|string or string[]||defines a default orient(ation) or orient(ation)s passed to child [`RenderHandler`s](render-handler.md) as `term` prop|

## Children

_**Children are required**_

Children can be any valid child of a React `Component` (so anything).

The `SwitchHandler` will only exert control over any direct child [`RenderHandler`s](render-handler.md) - using the complete set of all trigrams of the `RenderHandler`s to determine
which will be part of the component tree based on the most recent AppCon set on the TAO that matches
that set of trigrams.

## Example

Taken from the [React Integration Guide](../../client-react/README.md) and a follow up modification
of the example the [`RenderHandler`](render-handler.md) uses, we wrap our `SpaceContainer` with a
`SwitchHandler` to control not only what gets added to the component tree but also to remove
components that we no longer want in the component tree:

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
