# @tao.js/transport-tck

Transport conformance kit for tao.js — the executable form of the
[`ENVELOPE-SPEC.md` §9](https://github.com/zzyzxlab/tao.js/blob/main/ENVELOPE-SPEC.md#9-cross-process-wire-contract-normative-as-of-020)
wire contract and the transport-relevant behavioral invariants (§10).

A custom transport (message queue, WebSocket, BroadcastChannel, another
language's implementation behind a loopback) proves it honors the TAO
signal-plane contract by passing this kit. The built-in `@tao.js/socket.io`
transport passes it; so should yours.

## Usage

Give the kit a factory producing a connected pair of Kernels bridged by
your transport (loopback in-process is fine), from any test runner:

```js
import { Kernel } from '@tao.js/core';
import { assertTransportCompliance } from '@tao.js/transport-tck';

test('my transport honors the wire contract', async () => {
  await assertTransportCompliance(async () => {
    const a = new Kernel();
    const b = new Kernel();
    const link = await connectMyTransport(a, b); // your code
    return { a, b, close: () => link.teardown() };
  });
});
```

`runTransportCompliance(makeLink, opts)` returns structured results
instead of throwing: `{ pass, results: [{ name, pass, detail }] }`.
A fresh link is created per check. `opts.timeoutMs` (default 2000)
bounds each delivery wait.

## What it checks

1. **delivery** — a signal entered on A reaches handlers on B, trigram
   and datagram intact, exactly once.
2. **echo suppression + bidirectional reflex** — the arriving signal is
   not sent back to its origin, but descendants chained on the receiving
   side are.
3. **multi-hop emission** — every hop of a chain crosses, not just the
   entry.
4. **chain continuity** — with a Tracer on both ends, one cascade
   crossing A→B→A carries **one `traceId`** with exact cross-process
   parentage.
5. **cascade scoping** — sender-side cascade tags (process-local
   affinity, live references) never cross; affinity is translated by the
   transport, not copied.

Most custom transports should build on the boundary primitives in
`@tao.js/utils` (`wireEnvelope`, `enterFromWire`, `createTransport`) —
transports built on them pass this kit by construction.
