# DataConsumer Component (removed in 0.21)

`DataConsumer` was deprecated in 0.17 and removed in 0.21, along with the
`RenderHandler` `context` prop and the shared data bag they both read.

Read named `DataHandler` data anywhere in the tree with the
[`useTaoData(name)` hook](hooks.md#usetaodata) instead:

```javascript
import { useTaoData } from '@tao.js/react';

function SpaceRights(props) {
  // name matches the `name` prop of an ancestor DataHandler
  const rights = useTaoData('rights');
  if (!rights) {
    return null;
  }
  return props.children(rights);
}
```

Lookups walk the React ancestor chain — the nearest `DataHandler` with a
matching `name` wins, and sibling subtrees are isolated.
