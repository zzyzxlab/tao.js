# @tao.js/telemetry

> Telemetry for tao.js signal networks — causal tracing (see every AppCon
> your app sets as a cause → effect tree, in the product language of your
> trigrams) and the TaoLogger.

`TaoLogger` shows you the _sequence_ of signals; the `Tracer` shows you
the _causality_: which signal's handlers chained which AppCons, reassembled
into a tree. The tracer is a pure Network decoration (see ENVELOPE-SPEC.md):
a chain reducer derives `{ traceId, signalId, parentId }` per hop and an
observer emits one record per signal. **No instrumentation of any entry
surface is required** — kernel entries, channel entries, transponder
entries, chained hops, and channel mirrors all carry causality natively.

## Usage

```js
import TAO from '@tao.js/core';
import Tracer, { InMemorySink, ConsoleSink } from '@tao.js/telemetry';

const memory = new InMemorySink();
const tracer = new Tracer(TAO, { sinks: [memory, new ConsoleSink()] });

TAO.setCtx({ t: 'Space', a: 'Enter', o: 'Portal' }, data); // that's it

console.log(memory.format());
// ☯ {Space, Enter, Portal}
// ├── ☯ {Space, List, Portal}
// │   └── ☯ {Space, View, Portal}
// └── ☯ {User, Track, Admin}
```

Fidelity: every cascade traces as a full causal tree — as of
`@tao.js/core` 0.19 the envelope hop engine is the only dispatch path, so
there is no degraded mode.

## Records

Each signal produces one record:

```js
{
  traceId,   // 32 hex — shared by the whole causal tree
  signalId,  // 16 hex — this signal
  parentId,  // 16 hex | null — the signal whose handler chained this one
  t, a, o, key,
  timestamp,
  via,       // 'Intercept' | 'Async' | 'Inline' — the phase that produced
             // this hop; absent on entry hops (0.20)
  handlers: { intercept, async, inline },  // matching-handler counts
  data,      // only with the captureData option (true | (data, ac) => any)
}
```

Sinks are objects with `signal(record)`. Built-ins: `InMemorySink`
(`records`, `roots()`, `childrenOf()`, `toTree()`, `format()`, ring-buffer
`limit`) and `ConsoleSink` (live, depth-indented).

## Cross-process continuation

```js
import { toTraceparent } from '@tao.js/telemetry';

// origin side: put the current record's context on the wire
const header = toTraceparent(record); // 00-<traceId>-<signalId>-01

// remote side: continue the same trace
tracer.setCtx(trigram, data, { traceparent: header });
```

Chain state is JSON-clean by construction — transports can carry
`envelope.chain` across process boundaries directly (ENVELOPE-SPEC.md §9).

## Notes

- The tracer records _signals_ (network dispatches), not per-network handler
  executions — a channel's mirrored dispatch of the same AppCon is not a
  second record.
- Chained AppCons produced by **channel-attached** handlers re-enter through
  `channel.setAppCtx` (a fresh cascade, per Channel's frozen semantics) and
  start a new trace root.
- The tracer never dispatches handlers, and a throwing sink never breaks
  dispatch. `dispose()` detaches it.

## TaoLogger

The classic live logger (moved here from `@tao.js/utils`, which keeps a
deprecated re-export). Attach its handler as a full-wildcard intercept:

```js
import { TaoLogger } from '@tao.js/telemetry';

const logger = TaoLogger(true, { verbose: true, group: false });
TAO.addInterceptHandler({}, logger.handler);
// runtime switches: logger.doLogging(false), logger.verbose(true),
// logger.depth(2), logger.group(true), logger.setLogger(customConsole)
```

`TaoLogger` shows the sequence of signals; the `Tracer` shows their
causality — use either or both.
