import { AppCtx } from '@tao.js/core';

const DEFAULT_TRANSPORT = 'WIRE';

let transportInstance = 0;
function transportName(name) {
  return name || `${DEFAULT_TRANSPORT}${++transportInstance}`;
}

/**
 * Wire-envelope version. Receivers ignore wire envelopes with an unknown
 * version (treated as absent) rather than fail — see ENVELOPE-SPEC.md §9.
 *
 * @type {number}
 */
export const WIRE_VERSION = 1;

/**
 * The portable part of a dispatch envelope — what a transport serializes
 * alongside a signal's trigram + data (ENVELOPE-SPEC.md §9).
 *
 * @typedef {Object} WireEnvelope
 * @property {number} v - wire-envelope version (`WIRE_VERSION`)
 * @property {(Object|null)} chain - the sending hop's `envelope.chain`,
 *           verbatim (JSON-clean by construction), or `null`
 */

/**
 * The portable part of a dispatch envelope, for serializing alongside a
 * signal's trigram + data. Only `chain` crosses a process boundary:
 * `cascade` holds live references and process-local affinity, and `hop` is
 * boundary-local (ENVELOPE-SPEC.md §9).
 *
 * @param {Object} [envelope] - a dispatch envelope (`{ cascade, hop, chain }`)
 * @returns {WireEnvelope} `{ v: WIRE_VERSION, chain }` — `chain` is `null`
 *          when the envelope is absent or carries none
 */
export function wireEnvelope(envelope) {
  return {
    v: WIRE_VERSION,
    chain: envelope && envelope.chain ? envelope.chain : null,
  };
}

/**
 * Extract the continuable chain from a received wire envelope. Absent,
 * unversioned, or unknown-version envelopes yield `null` (fresh chain) —
 * one-sided backward compatibility with pre-wire senders. A `chain` that is
 * not a plain object (arrays included) also yields `null`.
 *
 * @param {WireEnvelope} [wire] - a received `{ v, chain }` wire envelope
 * @returns {(Object|null)} the received chain to continue, or `null`
 */
export function chainFromWire(wire) {
  if (
    !wire ||
    wire.v !== WIRE_VERSION ||
    !wire.chain ||
    typeof wire.chain !== 'object' ||
    Array.isArray(wire.chain)
  ) {
    return null;
  }
  return wire.chain;
}

/**
 * Enter a signal received from a remote process: stamps the transport's own
 * hop-scope origin marker (echo suppression) and continues the received
 * chain through the local reducers.
 *
 * Surface resolution follows the utils convention
 * (`typeof network.enter === 'function' ? network : network._network`).
 *
 * @param {(Kernel|Network|Channel)} network - any surface exposing `enter`
 *        (or a Kernel exposing `_network`)
 * @param {Object} tao - trigram (short or long keys; long-form keys win)
 * @param {*} data - datagram(s)
 * @param {(WireEnvelope|undefined)} wire - the received `{ v, chain }` wire
 *        envelope; pass `undefined` when the sender included none
 * @param {string} sourceName - this transport's origin marker
 * @returns {void}
 */
export function enterFromWire(network, tao, data, wire, sourceName) {
  const net = typeof network.enter === 'function' ? network : network._network;
  net.enter(
    new AppCtx(
      tao.term || tao.t,
      tao.action || tao.a,
      tao.orient || tao.o,
      data,
    ),
    {
      hop: { source: sourceName },
      chain: chainFromWire(wire),
    },
  );
}

/**
 * Duplex (Source-shaped) transport helper: emits every hop on the network —
 * with its wire envelope — except hops that arrived FROM this transport
 * (suppression applies to the arriving hop only, so chained responses flow
 * back out: the bidirectional reflex), and enters received signals with the
 * origin marker + continued chain.
 *
 * Everything transport-specific — connection lifecycle, routing, delivery
 * semantics, serialization of the emitted values — stays with the caller:
 * supply `send(tao, data, wire)` and invoke `receive(tao, data, wire)` for
 * inbound signals.
 *
 * Emission is phase-blind (`onDispatch`), matching Source's historical
 * semantics. For a veto-respecting emitter (e.g. a per-client reply path),
 * decorate with `onProceed` directly — see `@tao.js/socket.io`.
 *
 * @param {(Kernel|Network)} kernel - the network to bridge. Not a Channel:
 *        a duplex transport spans the whole kernel; channel-scoped reply
 *        paths belong to phase-gated emitters (see `@tao.js/socket.io`)
 * @param {Object} opts
 * @param {string} [opts.name] - origin-marker name (auto-generated if omitted)
 * @param {function(Object, *, WireEnvelope): void} opts.send -
 *        `(tao, data, wire) => void` outbound emitter
 * @returns {{ name: string, receive: function(Object, *, WireEnvelope=): void, dispose: function(): void }}
 *          the transport handle: `name` is the origin marker, `receive`
 *          enters an inbound signal (as `enterFromWire`), `dispose`
 *          detaches the emitting decoration
 * @throws {Error} when `kernel` is missing, when the resolved network lacks
 *         envelope support (`enter` + `decorate`) - upgrade `@tao.js/core`,
 *         or when `send` is not a function
 */
export function createTransport(kernel, { name, send } = {}) {
  if (!kernel || (typeof kernel.enter !== 'function' && !kernel._network)) {
    throw new Error(
      'must provide `kernel` to attach the transport to a network',
    );
  }
  const network = typeof kernel.enter === 'function' ? kernel : kernel._network;
  if (
    typeof network.enter !== 'function' ||
    typeof network.decorate !== 'function'
  ) {
    throw new Error(
      'createTransport requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
    );
  }
  if (typeof send !== 'function') {
    throw new Error('must provide `send` to emit signals to the wire');
  }
  const transport = transportName(name);
  const undecorate = network.decorate({
    // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
    name: `transport:${transport}`,
    onDispatch: (ac, envelope) => {
      if (envelope.hop.source !== transport) {
        send(ac.unwrapCtx(), ac.data, wireEnvelope(envelope));
      }
    },
  });
  return {
    name: transport,
    receive: (tao, data, wire) =>
      enterFromWire(network, tao, data, wire, transport),
    dispose: () => undecorate(),
  };
}
