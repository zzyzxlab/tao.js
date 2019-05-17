# [Original API] Reactor API

**Package:** `@tao.js/react`

**Named Export:** `Reactor`

A React `Component` that is the bridge from an [`Adapter`](adapter.md) to React's DOM tree.

Use a `Reactor` to connect an [`Adapter`](adapter.md) that is configured to adapt React Components
into TAO Handlers.

## Properties

|name|required|type|default|description|
|---|---|---|---|
|`adapter`|yes|`Adapter`||an [`Adapter`](adapter.md) that will determine which children to render for the `Reactor`|

## Children

_**Children are ignored**_

