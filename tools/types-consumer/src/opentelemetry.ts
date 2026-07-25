import { trace } from '@opentelemetry/api';
import { Kernel } from '@tao.js/core';
import { Tracer } from '@tao.js/telemetry';
import OpenTelemetrySink, {
  OpenTelemetrySink as NamedSink,
} from '@tao.js/opentelemetry';
import type { AssertFalse, IsAny } from './helpers';

type _sink = AssertFalse<IsAny<OpenTelemetrySink>>;
type _sameExport = AssertFalse<IsAny<typeof NamedSink>>;

const otelTracer = trace.getTracer('tao-consumer');
const sink = new OpenTelemetrySink(otelTracer, { endImmediately: true });

// integration: the OTel sink satisfies telemetry's sink contract
const kernel = new Kernel();
const tracer = new Tracer(kernel, { sinks: [sink] });
void tracer;
