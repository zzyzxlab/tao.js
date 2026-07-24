import { AppCtx } from '@tao.js/core';
import { newTraceId, newSignalId, parseTraceparent } from './ids';

/**
 * Namespaced chain key under which trace context is derived per hop by the
 * envelope engine (see ENVELOPE-SPEC.md).
 */
export const TRACE_CHAIN = 'taoTrace';

function countHandlers(iterator) {
  let count = 0;
  for (const handler of iterator) {
    handler;
    count++;
  }
  return count;
}

/**
 * Causal signal tracing as a pure Network decoration: a chain reducer
 * derives `{ traceId, signalId, parentId }` per hop, and an observer emits
 * one record per dispatched signal to attached sinks. No instrumentation of
 * any entry surface is required — every cascade (kernel entries, channel
 * entries, transponder entries, chained hops, channel mirrors) carries
 * causality natively.
 *
 * @export
 * @class Tracer
 */
export default class Tracer {
  /**
   * Creates an instance of Tracer.
   * @param {Kernel|Network} kernel - Kernel (or raw Network) whose signals to trace
   * @param {Object} [opts]
   * @param {Array<{signal: function}>} [opts.sinks] - sinks receiving one record per signal
   * @param {function} [opts.clock] - returns a ms-epoch timestamp (defaults to Date.now)
   * @param {boolean|function} [opts.captureData] - false (default) omits AppCon data;
   *        true attaches `ac.data` by reference; a function receives `(data, ac)` and
   *        its return value is attached (use to redact / clone)
   * @memberof Tracer
   */
  // Stryker disable next-line ArrayDeclaration: junk entries in the sinks default are call-guarded by the per-sink try
  constructor(kernel, { sinks = [], clock, captureData = false } = {}) {
    if (!kernel || (typeof kernel.enter !== 'function' && !kernel._network)) {
      throw new Error(
        'must provide `kernel` to attach the Tracer to a network',
      );
    }
    // a Kernel (or Channel) exposes the shared network via `_network`; a raw
    // Network is decorated directly
    this._network = kernel._network || kernel;
    if (
      typeof this._network.enter !== 'function' ||
      typeof this._network.decorate !== 'function'
    ) {
      throw new Error(
        'Tracer requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    this._canSetWildcard = !!kernel.canSetWildcard;
    this._sinks = new Set(sinks);
    this._clock = typeof clock === 'function' ? clock : () => Date.now();
    this._captureData = captureData;
    this._undecorate = this._network.decorate({
      // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
      name: 'tracer',
      chain: {
        key: TRACE_CHAIN,
        next: (prev) => ({
          traceId: prev ? prev.traceId : newTraceId(),
          signalId: newSignalId(),
          parentId: prev ? prev.signalId : null,
        }),
      },
      onDispatch: (ac, envelope, handler) =>
        this._record(ac, envelope, handler),
    });
  }

  addSink(sink) {
    if (!sink || typeof sink.signal !== 'function') {
      throw new Error('a sink must implement signal(record)');
    }
    this._sinks.add(sink);
    return this;
  }

  removeSink(sink) {
    this._sinks.delete(sink);
    return this;
  }

  /**
   * Set a Context on the network, optionally continuing a trace started
   * elsewhere (e.g. in another process).
   *
   * Plain `kernel.setCtx` entries are traced identically — this entry point
   * only adds the continuation capability.
   *
   * @param {Object} trigram - `{ t, a, o }` or `{ term, action, orient }`
   * @param {Object} [data]
   * @param {Object} [traceContext] - `{ traceparent }` (W3C header value) or
   *        `{ traceId, parentId }` to continue a trace started elsewhere
   * @memberof Tracer
   */
  setCtx({ t, term, a, action, o, orient }, data, traceContext) {
    this.setAppCtx(
      new AppCtx(term || t, action || a, orient || o, data),
      traceContext,
    );
  }

  /**
   * Set an AppCtx on the network, optionally continuing a remote trace.
   *
   * @param {AppCtx} ac
   * @param {Object} [traceContext]
   * @memberof Tracer
   */
  setAppCtx(ac, traceContext) {
    if (!this._canSetWildcard && ac.isWildcard) {
      return;
    }
    const remote = this._remoteContext(traceContext);
    this._network.enter(
      ac,
      remote
        ? {
            chain: {
              [TRACE_CHAIN]: {
                traceId: remote.traceId,
                signalId: remote.parentId,
              },
            },
          }
        : {},
    );
  }

  _remoteContext(traceContext) {
    if (!traceContext) {
      return null;
    }
    if (typeof traceContext.traceparent === 'string') {
      return parseTraceparent(traceContext.traceparent);
    }
    if (traceContext.traceId) {
      return {
        traceId: traceContext.traceId,
        parentId: traceContext.parentId || null,
      };
    }
    return null;
  }

  _record(ac, envelope, handler) {
    const stamp = envelope.chain[TRACE_CHAIN];
    const record = {
      traceId: stamp.traceId,
      signalId: stamp.signalId,
      parentId: stamp.parentId || null,
    };
    record.t = ac.t;
    record.a = ac.a;
    record.o = ac.o;
    record.key = ac.key;
    record.timestamp = this._clock();
    if (envelope.hop.via) {
      // the handler phase that produced this hop (ENVELOPE-SPEC.md §4)
      record.via = envelope.hop.via;
    }
    if (handler) {
      record.handlers = {
        intercept: countHandlers(handler.interceptHandlers),
        async: countHandlers(handler.asyncHandlers),
        inline: countHandlers(handler.inlineHandlers),
      };
    }
    if (this._captureData) {
      record.data =
        typeof this._captureData === 'function'
          ? this._captureData(ac.data, ac)
          : ac.data;
    }
    for (const sink of this._sinks) {
      try {
        sink.signal(record);
      } catch {
        // a failing sink must never break signal dispatch
      }
    }
  }

  /**
   * Detach the tracer decoration from the network.
   *
   * @memberof Tracer
   */
  dispose() {
    this._undecorate();
  }
}
