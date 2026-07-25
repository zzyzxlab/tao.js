import { Kernel } from '@tao.js/core';
import {
  Tracer,
  InMemorySink,
  ConsoleSink,
  TaoLogger,
  TRACE_CHAIN,
  newTraceId,
  newSignalId,
  toTraceparent,
  parseTraceparent,
} from '@tao.js/telemetry';
import type { TraceRecord, TraceTreeNode } from '@tao.js/telemetry';
import type { AssertFalse, IsAny } from './helpers';

type _traceRecord = AssertFalse<IsAny<TraceRecord>>;
type _traceTreeNode = AssertFalse<IsAny<TraceTreeNode>>;
type _tracer = AssertFalse<IsAny<Tracer>>;

const kernel = new Kernel();
const sink = new InMemorySink({ limit: 100 });
const tracer = new Tracer(kernel, { sinks: [sink] });
type _tracerKernelParam = AssertFalse<IsAny<ConstructorParameters<typeof Tracer>[0]>>;

const records: TraceRecord[] = sink.records;
const first: TraceRecord | undefined = records[0];
if (first) {
  const traceId: string = first.traceId;
  const parent: string | null = first.parentId;
  void traceId;
  void parent;
}
const rendered: string = sink.format({ showData: true });
void rendered;

const chainKey: string = TRACE_CHAIN;
const traceId: string = newTraceId();
const signalId: string = newSignalId();
const header: string = toTraceparent({ traceId, signalId });
const parsed = parseTraceparent(header);
type _parsed = AssertFalse<IsAny<typeof parsed>>;

void chainKey;
void tracer;
type _consoleSink = AssertFalse<IsAny<typeof ConsoleSink>>;
type _taoLogger = AssertFalse<IsAny<typeof TaoLogger>>;
