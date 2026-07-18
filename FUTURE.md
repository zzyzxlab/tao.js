TAO is:

- a DSL used to build applications by creating
- semantic business events allowing for a reactive architecture

`TAO.md` (for apps that use tao.js):

- documents the TAO messages in that repo, their purpose, and the protocol used between them
- is an intentional artifact of apps that implement with tao.js
- should be referenced from that app’s `AGENTS.md` so agents implementing there can find it

This repo’s agent guide is `AGENTS.md` (how to work on the tao.js library itself).

TODO

- [x] finish the transformation to nx.js (Nx 23.1.0; alpha ladder `0.16.3-alpha.nx{21,22,23}` on npm `alpha` tag)
- [ ] implement the TypeScript library wrapper
- [x] complete all tests for 100% code coverage
- [ ] create a mutation test suite and exercise it (Stryker: core, react, socket.io, utils at 100%; router/koa next)
- [ ] rewrite documentation site
- [x] update to React 19 implementation for @taojs/react
- [ ] transfer ownership to tao-land
- [ ] implement TAO.md (spec/template + tooling for consuming apps)
- [ ] implement a Go lib for the network
- [ ] implement Schema parsing/validation layer hooks for messages in TS
