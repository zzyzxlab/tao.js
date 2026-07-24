# `@tao.js/react` package API

The declarative API providing `Component`s that work with the [React Context API](https://reactjs.org/docs/context.html)
exports the following:

* [TaoProvider](provider.md) - named export
* [DataHandler](data-handler.md) - named export
* [RenderHandler](render-handler.md) - named export
* [SwitchHandler](switch-handler.md) - named export
* [withContext](with-context.md) - named export

Removed in 0.21 (deprecated since 0.17): `DataConsumer`, the `RenderHandler` `context` prop,
the `Provider` alias (import `TaoProvider`), and the `useTaoDataContext` alias — read named
`DataHandler` data with the `useTaoData(name)` hook instead ([hooks](../../client-react/hooks.md)).

The original public API for the `@tao.js/react` package exposes the following:

* [Adapter](adapter.md) - named export
* [Reactor](reactor.md) - named export
