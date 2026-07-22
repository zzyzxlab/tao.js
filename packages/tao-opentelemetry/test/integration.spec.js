import { AppCtx, Kernel } from '@tao.js/core';
import { trace as otelTrace } from '@opentelemetry/api';
// source import (not the built package) so this integration test always
// exercises the current @tao.js/telemetry source without requiring a build
import Tracer from '../../tao-telemetry/src/Tracer';
import OpenTelemetrySink from '../src/OpenTelemetrySink';

const TERM = 'otel';
const ACTION = 'test';
const ORIENT = 'jest';
const NEXT_ACTION = 'chained';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let nextSpan = 0;
function mkFakeTracer() {
  const spans = [];
  return {
    spans,
    startSpan: (name, options, ctx) => {
      const spanContext = {
        traceId: 'feedface'.repeat(4),
        spanId: `${++nextSpan}`.padStart(16, '0'),
        traceFlags: 1,
      };
      const span = {
        name,
        options,
        ctx,
        spanContext: () => spanContext,
        end: jest.fn(),
      };
      spans.push(span);
      return span;
    },
  };
}

describe('Tracer + OpenTelemetrySink end to end', () => {
  it('should export a plain-kernel causal chain as parented spans with no instrumentation', async () => {
    // Assemble
    const TAO = new Kernel();
    const otelTracer = mkFakeTracer();
    new Tracer(TAO, { sinks: [new OpenTelemetrySink(otelTracer)] });
    TAO.addInlineHandler({ t: TERM, a: ACTION, o: ORIENT }, () => {
      return new AppCtx(TERM, NEXT_ACTION, ORIENT);
    });
    // Act — a plain kernel entry, no tracer entry point, no instrument()
    TAO.setCtx({ t: TERM, a: ACTION, o: ORIENT }, {});
    await flush();
    // Assert
    expect(otelTracer.spans).toHaveLength(2);
    const [rootSpan, childSpan] = otelTracer.spans;
    expect(rootSpan.name).toBe(`${TERM}.${ACTION}.${ORIENT}`);
    expect(childSpan.name).toBe(`${TERM}.${NEXT_ACTION}.${ORIENT}`);
    expect(otelTrace.getSpanContext(childSpan.ctx)).toBe(
      rootSpan.spanContext(),
    );
    expect(rootSpan.end).toHaveBeenCalled();
    expect(childSpan.end).toHaveBeenCalled();
  });
});
