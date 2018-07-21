const DEFAULT_NAMESPACE = 'tao';
const SOURCE_PROP = '__$source$__';
const SOCKET_SOURCE = 'SOCKET';
const IS_SERVER = typeof window === 'undefined';
const EMIT_EVENT = IS_SERVER ? 0 : 1;
const ON_EVENT = IS_SERVER ? 1 : 0;
const EVENTS = ['fromServer', 'fromClient'];

function decorateSocket(TAO, socket) {
  socket.on(EVENTS[ON_EVENT], ({ tao, data }) => {
    const datum = Object.assign({}, data);
    if (!datum[tao.o]) {
      datum[tao.o] = {};
    }
    datum[tao.o][SOURCE_PROP] = SOCKET_SOURCE;
    TAO.setCtx(tao, datum);
  });

  const socketHandler = (tao, data) => {
    if (!data[tao.o] || data[tao.o][SOURCE_PROP] !== SOCKET_SOURCE) {
      socket.emit(EVENTS[EMIT_EVENT], { tao, data });
    }
  };

  if (IS_SERVER) {
    TAO.addInlineHandler({}, socketHandler);
  } else {
    TAO.addAsyncHandler({}, socketHandler);
  }

  if (IS_SERVER) {
    socket.on('disconnect', reason => {
      if (reason === 'client') {
        TAO.removeInlineHandler({}, socketHandler);
      }
    });
  }
}

const ioMiddleware = TAO => (socket, next) => {
  decorateSocket(TAO, socket);

  if (next && typeof next === 'function') {
    return next();
  }
};

export default function wireTaoJsToSocketIO(TAO, io, opts = {}) {
  const ns = opts.namespace || opts.ns || DEFAULT_NAMESPACE;
  if (!IS_SERVER) {
    if (io && typeof io === 'function') {
      const host = opts.host || '';
      const socket = io(`${host}/${ns}`);
      decorateSocket(TAO, socket);
      return socket;
    }
  } else {
    if (io && typeof io.of === 'function') {
      const namespacedEngine = io.of(`/${ns}`);
      namespacedEngine.use(ioMiddleware(TAO));
    } else {
      return ioMiddleware(TAO);
    }
  }
}
