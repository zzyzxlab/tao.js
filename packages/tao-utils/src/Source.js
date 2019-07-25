const DEFAULT_SOURCE = 'FROM';

let sourceInstance = 0;
function sourceName(name) {
  return name || `${DEFAULT_SOURCE}${++sourceInstance}`;
}

function sourceControl(source) {
  return { source };
}

export default class Source {
  constructor(kernel, fromSrc, toSrc, name) {
    this._network = kernel._network;
    fromSrc((tao, data) =>
      this._network.setCtxControl(
        tao,
        data,
        sourceControl(this.name),
        (ac, control) => kernel.forwardAppCtx(ac, control)
      )
    );
    this._toSrc = toSrc;
    this._name = sourceName(name);
    this._middleware = (handler, ac, fwd, control) =>
      this.handleAppCon(handler, ac, fwd, control);
    this._network.use(this._middleware);
  }

  get name() {
    return this._name;
  }

  handleAppCon(handler, ac, forwardAppCtx, control) {
    if (!control || control.source !== this.name) {
      this._toSrc(ac.unwrapCtx(), ac.data);
    }
  }

  dispose() {
    this._network.stop(this._middleware);
  }
}
