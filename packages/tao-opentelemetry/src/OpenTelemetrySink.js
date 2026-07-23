import {
  context as otelContext,
  trace as otelTrace,
  ROOT_CONTEXT,
  TraceFlags,
} from '@opentelemetry/api';

/**
 * A `@tao.js/telemetry` sink that exports each signal record as an OpenTelemetry
 * span, preserving causal parentage.
 *
 * TAO signals are instantaneous state transitions, not duration-bounded
 * operations, so by default each span starts and ends at the signal's
 * timestamp (a point-in-time span). Same-process parent → child linkage uses
 * real OTel span contexts (a `signalId → SpanContext` map). When a record's
 * parent was never seen locally (a remote hop, or evicted), the causal
 * reference is preserved as a span *link* built from the internal W3C-shaped
 * tao ids instead of a parent.
 *
 * The exporter only depends on `@opentelemetry/api` — bring your own SDK /
 * TracerProvider and pass one of its Tracers.
 *
 * @export
 * @class OpenTelemetrySink
 */
export default class OpenTelemetrySink {
  /**
   * Creates an instance of OpenTelemetrySink.
   * @param {import('@opentelemetry/api').Tracer} tracer - an OTel Tracer from your TracerProvider
   * @param {Object} [opts]
   * @param {function} [opts.rootContext] - returns the OTel Context to parent
   *        root signals under; defaults to `() => context.active()` so TAO
   *        cascades nest beneath an ambient span (e.g. an incoming HTTP request)
   * @param {boolean} [opts.endImmediately=true] - end each span at the signal
   *        timestamp (point-in-time semantics); pass false to end spans yourself
   * @param {Object} [opts.attributes] - static attributes added to every span
   * @param {number} [opts.maxRetainedSignals=10000] - size of the
   *        signalId → SpanContext map used for parentage (FIFO eviction)
   * @memberof OpenTelemetrySink
   */
  constructor(
    tracer,
    {
      rootContext,
      endImmediately = true,
      attributes = {},
      maxRetainedSignals = 10000,
    } = {},
  ) {
    if (!tracer || typeof tracer.startSpan !== 'function') {
      throw new Error(
        'must provide an OpenTelemetry `Tracer` (from a TracerProvider) to export signals',
      );
    }
    this._tracer = tracer;
    this._rootContext =
      typeof rootContext === 'function'
        ? rootContext
        : () => otelContext.active();
    this._endImmediately = endImmediately;
    this._attributes = attributes;
    this._max = maxRetainedSignals;
    this._spanContexts = new Map();
  }

  signal(record) {
    const { ctx, links } = this._parentage(record);
    const attributes = {
      'tao.term': record.t,
      'tao.action': record.a,
      'tao.orient': record.o,
      'tao.trace.id': record.traceId,
      'tao.signal.id': record.signalId,
      ...this._attributes,
    };
    if (record.parentId) {
      attributes['tao.signal.parent_id'] = record.parentId;
    }
    if (record.via) {
      attributes['tao.signal.via'] = record.via;
    }
    if (record.handlers) {
      attributes['tao.handlers.intercept'] = record.handlers.intercept;
      attributes['tao.handlers.async'] = record.handlers.async;
      attributes['tao.handlers.inline'] = record.handlers.inline;
    }
    const span = this._tracer.startSpan(
      `${record.t}.${record.a}.${record.o}`,
      {
        startTime: record.timestamp,
        attributes,
        links,
      },
      ctx,
    );
    this._remember(record.signalId, span.spanContext());
    if (this._endImmediately) {
      span.end(record.timestamp);
    }
    return span;
  }

  _parentage(record) {
    if (!record.parentId) {
      return { ctx: this._rootContext(), links: undefined };
    }
    const parentSpanContext = this._spanContexts.get(record.parentId);
    if (parentSpanContext) {
      return {
        ctx: otelTrace.setSpanContext(ROOT_CONTEXT, parentSpanContext),
        links: undefined,
      };
    }
    // parent signal unseen locally (remote hop or evicted) — keep the causal
    // reference as a span link on the internal tao ids instead of a parent
    return {
      ctx: this._rootContext(),
      links: [
        {
          context: {
            traceId: record.traceId,
            spanId: record.parentId,
            traceFlags: TraceFlags.SAMPLED,
          },
        },
      ],
    };
  }

  _remember(signalId, spanContext) {
    if (this._spanContexts.size >= this._max) {
      this._spanContexts.delete(this._spanContexts.keys().next().value);
    }
    this._spanContexts.set(signalId, spanContext);
  }
}
