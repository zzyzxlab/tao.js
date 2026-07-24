import {
  context as otelContext,
  trace as otelTrace,
  ROOT_CONTEXT,
} from '@opentelemetry/api';
import OpenTelemetrySink from '../src/OpenTelemetrySink';

const TAO_TRACE_ID = 'ab'.repeat(16);

let nextSpan = 0;
function mkFakeTracer() {
  const spans = [];
  const tracer = {
    spans,
    startSpan: jest.fn((name, options, ctx) => {
      const spanContext = {
        traceId: '1234abcd'.repeat(4),
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
    }),
  };
  return tracer;
}

let nextId = 0;
function mkRecord({ id, parentId = null, data, handlers, via } = {}) {
  const record = {
    traceId: TAO_TRACE_ID,
    signalId: id || `sig-${++nextId}`,
    parentId,
    t: 'Space',
    a: 'Enter',
    o: 'Portal',
    key: 'Space|Enter|Portal',
    timestamp: 1700000000000 + nextId,
    handlers: handlers || { intercept: 1, async: 2, inline: 3 },
  };
  if (typeof data !== 'undefined') {
    record.data = data;
  }
  if (typeof via !== 'undefined') {
    record.via = via;
  }
  return record;
}

describe('OpenTelemetrySink exports a class', () => {
  it('should require an OpenTelemetry Tracer', () => {
    // Assemble
    // Act
    // Assert
    expect(() => new OpenTelemetrySink()).toThrow(
      /must provide an OpenTelemetry/,
    );
    expect(() => new OpenTelemetrySink({})).toThrow(
      /must provide an OpenTelemetry/,
    );
    expect(new OpenTelemetrySink(mkFakeTracer())).toBeInstanceOf(
      OpenTelemetrySink,
    );
  });
});

describe('OpenTelemetrySink maps signal records to spans', () => {
  it('should export a root signal as a span named by its trigram', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    const record = mkRecord({ id: 'root' });
    // Act
    sink.signal(record);
    // Assert
    expect(tracer.startSpan).toHaveBeenCalledTimes(1);
    const [span] = tracer.spans;
    expect(span.name).toBe('Space.Enter.Portal');
    expect(span.options.startTime).toBe(record.timestamp);
    expect(span.ctx).toBe(otelContext.active());
    expect(span.ctx).toBe(ROOT_CONTEXT);
  });

  it('should carry tao semantics as span attributes', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer, {
      attributes: { 'service.flavor': 'test' },
    });
    // Act
    sink.signal(mkRecord({ id: 'root' }));
    // Assert
    const { attributes } = tracer.spans[0].options;
    expect(attributes).toMatchObject({
      'tao.term': 'Space',
      'tao.action': 'Enter',
      'tao.orient': 'Portal',
      'tao.trace.id': TAO_TRACE_ID,
      'tao.signal.id': 'root',
      'tao.handlers.intercept': 1,
      'tao.handlers.async': 2,
      'tao.handlers.inline': 3,
      'service.flavor': 'test',
    });
    expect(attributes['tao.signal.parent_id']).toBeUndefined();
    // an entry-hop record has no via, so the attribute key must be absent
    expect('tao.signal.via' in attributes).toBe(false);
  });

  it('should carry the producing phase as tao.signal.via when present', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    // Act
    sink.signal(mkRecord({ id: 'chained', parentId: 'root', via: 'Async' }));
    // Assert
    expect(tracer.spans[0].options.attributes['tao.signal.via']).toBe('Async');
  });

  it('should omit the tao.signal.via attribute for records without via', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    // Act
    sink.signal(mkRecord({ id: 'entry' }));
    // Assert — key absence, not just an undefined value
    const { attributes } = tracer.spans[0].options;
    expect(Object.keys(attributes)).not.toContain('tao.signal.via');
    expect('tao.signal.via' in attributes).toBe(false);
  });

  it('should parent a child span under its causal parent span', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    // Act
    sink.signal(mkRecord({ id: 'root' }));
    sink.signal(mkRecord({ id: 'child', parentId: 'root' }));
    // Assert
    const [rootSpan, childSpan] = tracer.spans;
    expect(otelTrace.getSpanContext(childSpan.ctx)).toBe(
      rootSpan.spanContext(),
    );
    expect(childSpan.options.links).toBeUndefined();
    expect(childSpan.options.attributes['tao.signal.parent_id']).toBe('root');
  });

  it('should fall back to a span link on tao ids for an unseen parent', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    // Act
    sink.signal(mkRecord({ id: 'local', parentId: 'cd'.repeat(8) }));
    // Assert
    const [span] = tracer.spans;
    expect(span.ctx).toBe(ROOT_CONTEXT);
    expect(span.options.links).toEqual([
      {
        context: {
          traceId: TAO_TRACE_ID,
          spanId: 'cd'.repeat(8),
          traceFlags: 1,
        },
      },
    ]);
  });

  it('should parent root signals under a custom ambient context', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const ambientSpanContext = {
      traceId: 'ef'.repeat(16),
      spanId: '12'.repeat(8),
      traceFlags: 1,
    };
    const ambient = otelTrace.setSpanContext(ROOT_CONTEXT, ambientSpanContext);
    const sink = new OpenTelemetrySink(tracer, { rootContext: () => ambient });
    // Act
    sink.signal(mkRecord({ id: 'root' }));
    // Assert
    expect(tracer.spans[0].ctx).toBe(ambient);
  });

  it('should end each span at the signal timestamp by default', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    const record = mkRecord({ id: 'root' });
    // Act
    const span = sink.signal(record);
    // Assert
    expect(span.end).toHaveBeenCalledWith(record.timestamp);
  });

  it('should leave spans open when endImmediately is false', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer, { endImmediately: false });
    // Act
    const span = sink.signal(mkRecord({ id: 'root' }));
    // Assert
    expect(span.end).not.toHaveBeenCalled();
  });

  it('should evict oldest span contexts beyond maxRetainedSignals', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer, { maxRetainedSignals: 1 });
    // Act
    sink.signal(mkRecord({ id: 'first' }));
    sink.signal(mkRecord({ id: 'second' })); // evicts 'first'
    sink.signal(mkRecord({ id: 'third', parentId: 'first' }));
    // Assert
    const third = tracer.spans[2];
    expect(third.options.links).toHaveLength(1);
    expect(otelTrace.getSpanContext(third.ctx)).toBeUndefined();
  });
});

describe('OpenTelemetrySink duck-typed records', () => {
  it('should export records without handler counts', () => {
    // Assemble
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    const record = mkRecord({ id: 'bare' });
    delete record.handlers;
    // Act
    sink.signal(record);
    // Assert
    const { attributes } = tracer.spans[0].options;
    expect(attributes['tao.handlers.intercept']).toBeUndefined();
    expect(attributes['tao.handlers.async']).toBeUndefined();
    expect(attributes['tao.handlers.inline']).toBeUndefined();
  });
});

describe('OpenTelemetrySink assertion tightening (mutation)', () => {
  it('should give root spans no links at all', () => {
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    sink.signal(mkRecord({ id: 'root' }));
    expect(tracer.spans[0].options.links).toBeUndefined();
    expect(otelTrace.getSpanContext(tracer.spans[0].ctx)).toBeUndefined();
  });

  it('should retain span contexts for sibling fan-out parentage', () => {
    const tracer = mkFakeTracer();
    const sink = new OpenTelemetrySink(tracer);
    sink.signal(mkRecord({ id: 'root' }));
    sink.signal(mkRecord({ id: 'childA', parentId: 'root' }));
    sink.signal(mkRecord({ id: 'childB', parentId: 'root' }));
    const [rootSpan, , childBSpan] = tracer.spans;
    // childB must still parent under root (no premature eviction)…
    expect(otelTrace.getSpanContext(childBSpan.ctx)).toBe(
      rootSpan.spanContext(),
    );
    // …with no link fallback
    expect(childBSpan.options.links).toBeUndefined();
  });
});
