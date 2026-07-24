import { AppCtx } from '@tao.js/core';
import { newTraceId, newSignalId, parseTraceparent } from './ids';

/**
 * One traced signal, as delivered to every sink's `signal(record)`.
 *
 * A record describes a network dispatch, not a handler execution — a
 * channel's mirrored dispatch of the same AppCon on its private registry is
 * not a second record.
 *
 * @typedef {Object} TraceRecord
 * @property {string} traceId - 32 lowercase hex chars (W3C trace id), shared
 *           by every signal in the causal tree
 * @property {string} signalId - 16 lowercase hex chars (W3C span id) naming
 *           this signal
 * @property {string|null} parentId - `signalId` of the signal whose handler
 *           chained this one; null for a trace root
 * @property {string} t - term of the signal's trigram
 * @property {string} a - action of the signal's trigram
 * @property {string} o - orient of the signal's trigram
 * @property {string} key - the trigram's AppCtx key (`t|a|o`)
 * @property {number} timestamp - ms-epoch time from the tracer's clock
 * @property {'Intercept'|'Async'|'Inline'} [via] - handler phase that chained
 *           this signal (ENVELOPE-SPEC.md §4); entry hops carry no `via`
 * @property {{ intercept: number, async: number, inline: number }} [handlers] -
 *           counts of handlers matching this trigram (wildcard registrations
 *           included) on the decorated network at dispatch time; handlers
 *           attached to Channels' private registries are not counted
 * @property {*} [data] - the AppCon data, only with the `captureData` option
 */

/**
 * Namespaced chain key under which trace context is derived per hop by the
 * envelope engine (see ENVELOPE-SPEC.md). Chain keys are exclusive — a
 * Network accepts one reducer per key — so constructing a second Tracer on
 * the same network throws. This is also the key transports carry across
 * process boundaries (§9): an inbound W3C `traceparent` maps to
 * `chain: { [TRACE_CHAIN]: { traceId, signalId } }` on entry.
 */
export const TRACE_CHAIN = 'taoTrace';

/**
 * Count a handler iterator without materializing it.
 *
 * @param {Iterable<function>} iterator
 * @returns {number}
 */
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
   * @param {Object} kernel - Kernel (or Channel, or raw Network) whose signals
   *        to trace; anything exposing the shared network via `_network`, or a
   *        Network itself, is decorated
   * @param {Object} [opts]
   * @param {Array<{signal: function(TraceRecord): void}>} [opts.sinks] - sinks
   *        receiving one record per signal
   * @param {function(): number} [opts.clock] - returns a ms-epoch timestamp
   *        (defaults to Date.now)
   * @param {boolean|function(*, AppCtx): *} [opts.captureData] - false (default)
   *        omits AppCon data; true attaches `ac.data` by reference; a function
   *        receives `(data, ac)` and its return value is attached (use to
   *        redact / clone)
   * @throws when `kernel` is absent, when the core predates envelope support,
   *         or when the network's {@link TRACE_CHAIN} chain key is already
   *         reduced by another decoration (one Tracer per network)
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

  /**
   * Attach a sink to receive one {@link TraceRecord} per signal.
   *
   * @param {{ signal: function(TraceRecord): void }} sink
   * @returns {this}
   * @memberof Tracer
   */
  addSink(sink) {
    if (!sink || typeof sink.signal !== 'function') {
      throw new Error('a sink must implement signal(record)');
    }
    this._sinks.add(sink);
    return this;
  }

  /**
   * Detach a previously attached sink (a no-op when not attached).
   *
   * @param {{ signal: function(TraceRecord): void }} sink
   * @returns {this}
   * @memberof Tracer
   */
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
   * @param {{ t?: string, a?: string, o?: string, term?: string, action?: string, orient?: string }} trigram -
   *        `{ t, a, o }` or `{ term, action, orient }` (long forms win when
   *        both are present)
   * @param {*} [data]
   * @param {{ traceparent?: string, traceId?: string, parentId?: string|null }} [traceContext] -
   *        `{ traceparent }` (W3C header value) or `{ traceId, parentId }` to
   *        continue a trace started elsewhere: the entry keeps the remote
   *        `traceId` and is parented to `parentId`. An absent or malformed
   *        context starts a new root trace instead
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
   * A continuation seeds the entry's chain with
   * `{ [TRACE_CHAIN]: { traceId, signalId: parentId } }`, which the chain
   * reducer treats exactly like a parent hop's stamp — the remote signal
   * becomes the entry's parent.
   *
   * @param {AppCtx} ac - dropped silently when wildcard and the attached
   *        kernel disallows wildcard entry (parity with `Kernel.setAppCtx`)
   * @param {{ traceparent?: string, traceId?: string, parentId?: string|null }} [traceContext] -
   *        see {@link Tracer#setCtx}
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

  /**
   * Normalize a continuation context to `{ traceId, parentId }`, preferring
   * a W3C `traceparent` header when given. Returns null (start a new root)
   * when absent or malformed.
   *
   * @param {{ traceparent?: string, traceId?: string, parentId?: string|null }} [traceContext]
   * @returns {{ traceId: string, parentId: string|null }|null}
   */
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

  /**
   * The `onDispatch` observer: assemble one {@link TraceRecord} from the
   * hop's {@link TRACE_CHAIN} chain stamp and fan it out to every sink.
   * Handler counts are taken from the matched registry entry at dispatch
   * time (the decorated main network only); a throwing sink is isolated so
   * it never breaks signal dispatch.
   *
   * @param {AppCtx} ac
   * @param {{ cascade: Object, hop: Object, chain: Object }} envelope
   * @param {Object} handler - the matched AppCtxHandlers registry entry
   */
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
