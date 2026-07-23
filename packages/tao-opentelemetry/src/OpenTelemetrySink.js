import {
  context as otelContext,
  trace as otelTrace,
  ROOT_CONTEXT,
  TraceFlags,
} from '@opentelemetry/api';

/** @typedef {import('@tao.js/telemetry').TraceRecord} TraceRecord */

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
   * @param {function(): import('@opentelemetry/api').Context} [opts.rootContext] -
   *        returns the OTel Context to parent root signals under; defaults to
   *        `() => context.active()` so TAO cascades nest beneath an ambient
   *        span (e.g. an incoming HTTP request). Also used when a record's
   *        parent is unseen locally (see `_parentage`)
   * @param {boolean} [opts.endImmediately=true] - end each span at the signal
   *        timestamp (point-in-time semantics); pass false to end spans yourself
   * @param {Object<string, *>} [opts.attributes] - static attributes added to
   *        every span; applied last, so a static key wins over an emitted
   *        `tao.*` attribute on collision
   * @param {number} [opts.maxRetainedSignals=10000] - size of the
   *        signalId → SpanContext map used for parentage (FIFO eviction; a
   *        child arriving after its parent's eviction degrades to a span link)
   * @throws when `tracer` is absent or is not an OTel Tracer (no `startSpan`)
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

  /**
   * Sink interface: export one signal record as a span named
   * `Term.Action.Orient`, started (and, unless `endImmediately: false`,
   * ended) at the record's timestamp. Emitted attributes:
   *
   * - `tao.term` / `tao.action` / `tao.orient` — the signal's trigram
   * - `tao.trace.id` — the tao-internal W3C-shaped trace id (32 hex) shared
   *   by the whole causal tree, including its remote continuations
   * - `tao.signal.id` — this signal's tao-internal id (16 hex); distinct
   *   from the OTel span id the SDK assigns
   * - `tao.signal.parent_id` — the causing signal's id; omitted on trace
   *   roots
   * - `tao.signal.via` — the handler phase that chained this signal
   *   (`Intercept` | `Async` | `Inline`); omitted on entry hops, which no
   *   phase produced
   * - `tao.handlers.intercept` / `tao.handlers.async` / `tao.handlers.inline`
   *   — counts of handlers matching the trigram at dispatch time on the main
   *   network only (wildcard registrations included; Channels' private
   *   registries are not); omitted when the record carries no counts
   *
   * Parentage and the span-link fallback are resolved by `_parentage`.
   *
   * @param {TraceRecord} record
   * @returns {import('@opentelemetry/api').Span} the started span (already
   *          ended unless `endImmediately: false`)
   * @memberof OpenTelemetrySink
   */
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

  /**
   * Resolve a record's OTel parentage, in fallback order:
   *
   * 1. no `parentId` — a root: parent under `rootContext()` (ambient
   *    nesting beneath e.g. an instrumented HTTP request's span);
   * 2. parent seen locally — a real child: the remembered parent
   *    SpanContext set on ROOT_CONTEXT (explicit parent; ambient context
   *    deliberately ignored);
   * 3. parent unseen (remote hop, or evicted past `maxRetainedSignals`) —
   *    parent under `rootContext()` and keep the causal reference as a span
   *    *link* built from the W3C-shaped tao ids (`traceId`,
   *    `spanId: parentId`, sampled) — honest linkage, never a guessed
   *    parent.
   *
   * @param {TraceRecord} record
   * @returns {{ ctx: import('@opentelemetry/api').Context, links: (Array<{context: Object}>|undefined) }}
   */
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

  /**
   * Retain a signal's SpanContext for future child parentage, evicting the
   * oldest entry (FIFO) once the map reaches `maxRetainedSignals`.
   *
   * @param {string} signalId
   * @param {import('@opentelemetry/api').SpanContext} spanContext
   */
  _remember(signalId, spanContext) {
    if (this._spanContexts.size >= this._max) {
      this._spanContexts.delete(this._spanContexts.keys().next().value);
    }
    this._spanContexts.set(signalId, spanContext);
  }
}
