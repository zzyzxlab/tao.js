# @tao.js/opentelemetry

> Export tao.js signal traces to OpenTelemetry — one span per AppCon, with
> causal parentage preserved.

A sink for [`@tao.js/telemetry`](../tao-telemetry) that maps each signal record onto
an OTel span. Depends only on `@opentelemetry/api`; bring your own SDK /
`TracerProvider`.

## Usage

```js
import TAO from '@tao.js/core';
import Tracer from '@tao.js/telemetry';
import OpenTelemetrySink from '@tao.js/opentelemetry';
import { trace } from '@opentelemetry/api';

const otelTracer = trace.getTracer('my-app'); // from your configured SDK
const tracer = new Tracer(TAO, {
  sinks: [new OpenTelemetrySink(otelTracer)],
});
tracer.instrument(TAO);
```

Every AppCon becomes a span named `Term.Action.Orient` with attributes
`tao.term` / `tao.action` / `tao.orient`, the internal `tao.trace.id` /
`tao.signal.id` ids, and matching-handler counts.

## Semantics

- **Point-in-time spans.** TAO signals are instantaneous state transitions,
  so each span starts and ends at the signal timestamp by default
  (`endImmediately: false` to manage span lifetimes yourself).
- **Parentage.** Same-process cause → effect uses real OTel span contexts.
  When a parent signal was never seen locally (remote hop, evicted), the
  causal reference is kept as a span **link** built from the W3C-shaped tao
  ids — the tree stays honest instead of guessing.
- **Ambient nesting.** Root signals parent under `context.active()` by
  default, so a TAO cascade triggered inside an instrumented HTTP request
  nests beneath that request's span. Override with `rootContext: () => ctx`.

## Options

| option               | default                  | purpose                            |
| -------------------- | ------------------------ | ---------------------------------- |
| `rootContext`        | `() => context.active()` | OTel Context for root signals      |
| `endImmediately`     | `true`                   | end spans at the signal timestamp  |
| `attributes`         | `{}`                     | static attributes on every span    |
| `maxRetainedSignals` | `10000`                  | parentage map size (FIFO eviction) |

## Distributed traces

`@tao.js/telemetry` continues its **internal** trace across processes via W3C
`traceparent` (see its README). Full OTel-level distributed correlation —
making the remote process's spans children of the origin's OTel spans —
additionally requires propagating OTel context with your transport's
propagator; until then, cross-process hops surface as span links on the tao
ids plus the shared `tao.trace.id` attribute.
