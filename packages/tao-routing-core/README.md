# `@tao.js/routing-core`

Framework-agnostic **route entry → AppCon** helpers for tao.js router adapters.

Host routers own URLs and layouts. This package owns:

- importing a TAO feature module (`initialize` + `load`) from a loader
- normalizing / applying loader signals onto a Kernel
- factories for React hooks that fire those signals (adapters inject React)

See `@tao.js/routing-react-router`, `@tao.js/routing-tanstack-router`, and `@tao.js/routing-next`.
