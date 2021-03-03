const DEFAULT_SOURCE = 'FROM';

let sourceInstance = 0;
function sourceName(name) {
  return name || `${DEFAULT_SOURCE}${++sourceInstance}`;
}

function sourceControl(source) {
  return { source };
}

export default class Source {
  constructor(kernel, toSrc, name, fromSrc) {
    if (!kernel || !kernel._network) {
      throw new Error(
        'must provide `kernel` to attach the Source to a network'
      );
    }
    this._network = kernel._network;
    this.forwardAppCtx = (ac, control) => {
      kernel.forwardAppCtx(ac, control);
    };
    if (!toSrc) {
      throw new Error('must provide `toSrc` way to send ACs to the source');
    }
    if (typeof name === 'function') {
      fromSrc = name;
      name = null;
    }
    // Make fromSrc optional for binding a handler
    // if not passed it is a function exposed by the Source i.e. setCtx
    if (fromSrc) {
      if (typeof fromSrc !== 'function') {
        throw new Error('optional `fromSrc` must be a function');
      }
      fromSrc((tao, data) =>
        this._network.setCtxControl(
          tao,
          data,
          sourceControl(this.name),
          this.forwardAppCtx
        )
      );
    }
    this._toSrc = toSrc;
    this._name = sourceName(name);
    this._middleware = (handler, ac, fwd, control) =>
      this.handleAppCon(handler, ac, fwd, control);
    this._network.use(this._middleware);
  }

  get name() {
    return this._name;
  }

  handleAppCon = (handler, ac, forwardAppCtx, control) => {
    if (!control || control.source !== this.name) {
      this._toSrc(ac.unwrapCtx(), ac.data);
    }
  };

  setCtx = ({ t, term, a, action, o, orient }, data) => {
    this._network.setCtxControl(
      { t, term, a, action, o, orient },
      data,
      sourceControl(this.name),
      this.forwardAppCtx
    );
  };

  dispose() {
    this._network.stop(this._middleware);
  }
}
