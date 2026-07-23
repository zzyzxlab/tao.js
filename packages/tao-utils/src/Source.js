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
 * Bridges a Network to an external source of AppCons (e.g. a socket): emits
 * every AppCon on the network to the source, except those that arrived FROM
 * the source — suppression applies to the arriving hop only, so AppCons
 * chained in response are emitted back out (the bidirectional reflex).
 *
 * Implemented as a Network decoration; the origin marker rides the
 * envelope's hop scope (entry hop only) — see ENVELOPE-SPEC.md.
 *
 * @export
 * @class Source
 */
export default class Source {
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

  get name() {
    return this._name;
  }

  handleAppCon = (ac, envelope) => {
    if (envelope.hop.source !== this.name) {
      this._toSrc(ac.unwrapCtx(), ac.data);
    }
  };

  setCtx = ({ t, term, a, action, o, orient }, data) => {
    this._enter({ t, term, a, action, o, orient }, data);
  };

  _enter({ t, term, a, action, o, orient }, data) {
    this._network.enter(new AppCtx(term || t, action || a, orient || o, data), {
      hop: sourceControl(this.name),
    });
  }

  dispose() {
    this._undecorate();
  }
}
