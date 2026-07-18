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
 * Like Source, but `fromSrc` is required. (Previously carried an unbound
 * `kernel.forwardAppCtx` reference that threw on any chained AppCon; the
 * envelope hop engine owns forwarding now.) Unexported / experimental.
 *
 * @export
 * @class Relay
 */
export default class Relay {
  constructor(kernel, toSrc, name, fromSrc) {
    if (!kernel || !kernel._network) {
      throw new Error(
        'must provide `kernel` to attach the Source to a network',
      );
    }
    this._network = kernel._network;
    if (typeof this._network.enter !== 'function') {
      throw new Error(
        'Relay requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
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
    fromSrc((tao, data) => this._enter(tao, data));
    this._middleware = (handler, ac, fwd, control, envelope) =>
      this.handleAppCon(handler, ac, fwd, control, envelope);
    this._network.use(this._middleware);
  }

  get name() {
    return this._name;
  }

  handleAppCon(handler, ac, forwardAppCtx, control, envelope) {
    const origin =
      envelope && envelope.hop
        ? envelope.hop.source
        : control && control.source;
    if (origin !== this.name) {
      this._toSrc(ac.unwrapCtx(), ac.data);
    }
  }

  setCtx = ({ t, term, a, action, o, orient }, data) => {
    this._enter({ t, term, a, action, o, orient }, data);
  };

  _enter({ t, term, a, action, o, orient }, data) {
    this._network.enter(new AppCtx(term || t, action || a, orient || o, data), {
      hop: sourceControl(this.name),
    });
  }

  dispose() {
    this._network.stop(this._middleware);
  }
}
