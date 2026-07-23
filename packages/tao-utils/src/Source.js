import { AppCtx } from '@tao.js/core';

const DEFAULT_SOURCE = 'FROM';

let sourceInstance = 0;
function sourceName(name) {
  return name || `${DEFAULT_SOURCE}${++sourceInstance}`;
}

function sourceControl(source) {
  return { source };
}

/**
 * A trigram in short (`t`/`a`/`o`) or long (`term`/`action`/`orient`) keys;
 * long-form keys win.
 *
 * @typedef {Object} Trigram
 * @property {string} [t] - term (short key)
 * @property {string} [term] - term (long key)
 * @property {string} [a] - action (short key)
 * @property {string} [action] - action (long key)
 * @property {string} [o] - orient (short key)
 * @property {string} [orient] - orient (long key)
 */

/**
 * Bridges a Network to an external source of AppCons (e.g. a socket): emits
 * every AppCon on the network to the source, except those that arrived FROM
 * the source — suppression applies to the arriving hop only, so AppCons
 * chained in response are emitted back out (the bidirectional reflex).
 *
 * Implemented as a Network decoration; the origin marker rides the
 * envelope's hop scope (entry hop only) — see ENVELOPE-SPEC.md.
 * Decoration: `onDispatch` (phase-blind emission), self-filtered on
 * `envelope.hop.source`.
 *
 * @export
 * @class Source
 */
export default class Source {
  /**
   * Creates an instance of Source.
   *
   * Note the Source resolves its network from `kernel._network` only (it
   * does not apply the utils surface-resolution convention, so a bare
   * `Network` is not accepted); the resolved network must support `enter`
   * and `decorate`.
   *
   * @param {Kernel} kernel - Kernel-shaped wrapper (exposing `_network`) to attach the Source to
   * @param {function(Object, *): void} toSrc - outbound emitter called with
   *        `(tao, data)` — the unwrapped `{ t, a, o }` trigram and the
   *        datagram(s) — for every AppCon except those arriving from this Source
   * @param {(string|function)} [name] - the Source's name, used as its
   *        hop-scope origin marker (auto-generated `FROM<n>` when omitted);
   *        passing a `function` here is the `fromSrc` overload
   * @param {function(function(Trigram, *): void): void} [fromSrc] - binder for
   *        the inbound side: called once with a setter `(tao, data)` that
   *        enters received signals stamped with this Source's origin marker
   * @throws {Error} when `kernel` (or its `_network`) is missing, when the
   *         network lacks envelope support (`enter` + `decorate`) - upgrade
   *         `@tao.js/core`, when `toSrc` is missing, or when `fromSrc` is
   *         given but not a function
   * @memberof Source
   */
  constructor(kernel, toSrc, name, fromSrc) {
    if (!kernel || !kernel._network) {
      throw new Error(
        'must provide `kernel` to attach the Source to a network',
      );
    }
    this._network = kernel._network;
    if (
      typeof this._network.enter !== 'function' ||
      typeof this._network.decorate !== 'function'
    ) {
      throw new Error(
        'Source requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    if (!toSrc) {
      throw new Error('must provide `toSrc` way to send ACs to the source');
    }
    if (typeof name === 'function') {
      fromSrc = name;
      name = null;
    }
    this._toSrc = toSrc;
    this._name = sourceName(name);
    // Make fromSrc optional for binding a handler
    // if not passed it is a function exposed by the Source i.e. setCtx
    if (fromSrc) {
      if (typeof fromSrc !== 'function') {
        throw new Error('optional `fromSrc` must be a function');
      }
      fromSrc((tao, data) => this._enter(tao, data));
    }
    this._undecorate = this._network.decorate({
      // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
      name: `source:${this._name}`,
      onDispatch: (ac, envelope) => this.handleAppCon(ac, envelope),
    });
  }

  /**
   * The Source's name — the hop-scope origin marker it stamps on entries
   * and filters emission on.
   *
   * @type {string}
   * @memberof Source
   */
  get name() {
    return this._name;
  }

  /**
   * `onDispatch` decoration callback: emits every dispatched AppCon to the
   * source except those whose arriving hop carries this Source's origin
   * marker. Suppression reads the hop scope only — hops after the entry
   * reset to `{}` — so AppCons chained in response are emitted back out
   * (the bidirectional reflex).
   *
   * @param {AppCtx} ac
   * @param {Object} envelope - the dispatch envelope `{ cascade, hop, chain }`
   * @returns {void}
   * @memberof Source
   */
  handleAppCon = (ac, envelope) => {
    if (envelope.hop.source !== this.name) {
      this._toSrc(ac.unwrapCtx(), ac.data);
    }
  };

  /**
   * Enters a signal received from the source: builds an AppCtx (long-form
   * trigram keys win) and enters it with this Source's origin marker on the
   * entry hop, suppressing the echo back to the source.
   *
   * @param {Trigram} trigram
   * @param {*} data - datagram(s) for the signal
   * @returns {void}
   * @memberof Source
   */
  setCtx = ({ t, term, a, action, o, orient }, data) => {
    this._enter({ t, term, a, action, o, orient }, data);
  };

  /**
   * @param {Trigram} trigram
   * @param {*} data
   * @private
   */
  _enter({ t, term, a, action, o, orient }, data) {
    this._network.enter(new AppCtx(term || t, action || a, orient || o, data), {
      hop: sourceControl(this.name),
    });
  }

  /**
   * Detach this Source's decoration from the network: stops emitting to the
   * source. Inbound entries via `setCtx`/`fromSrc` still dispatch.
   *
   * @returns {void}
   * @memberof Source
   */
  dispose() {
    this._undecorate();
  }
}
