import { Kernel } from '@tao.js/core';

const DEFAULT_NAMESPACE = 'tao';
const SOURCE_PROP = '__$source$__';
const SOCKET_SOURCE = 'SOCKET';
const IS_SERVER = typeof window === 'undefined';
const EMIT_EVENT = IS_SERVER ? 0 : 1;
const ON_EVENT = IS_SERVER ? 1 : 0;
const EVENTS = ['fromServer', 'fromClient'];

const socketHandler = socket => (tao, data) => {
  if (!data[tao.o] || data[tao.o][SOURCE_PROP] !== SOCKET_SOURCE) {
    // console.log(`sending to socket[${socket.id}]:`, tao);
    socket.emit(EVENTS[EMIT_EVENT], { tao, data });
  }
};

function decorateSocket(TAO, socket, forwardACs) {
  socket.on(EVENTS[ON_EVENT], ({ tao, data }) => {
    // console.log(`socket[${socket.id}] received event:`, tao);
    if (!forwardACs) {
      TAO.setCtx(tao, data);
      return;
    }
    const datum = Object.assign({}, data);
    if (!datum[tao.o]) {
      datum[tao.o] = {};
    }
    datum[tao.o][SOURCE_PROP] = SOCKET_SOURCE;
    TAO.setCtx(tao, datum);
  });

  if (IS_SERVER) {
    if (forwardACs) {
      const handler = socketHandler(socket);
      TAO.addInlineHandler({}, handler);
      socket.on('disconnect', () => {
        TAO.removeInlineHandler({}, handler);
      });
    }
  } else {
    TAO.addAsyncHandler({}, socketHandler(socket));
  }
}

const ioMiddleware = (TAO, onConnect) => (socket, next) => {
  if (onConnect && typeof onConnect === 'function') {
    let clientTAO = new Kernel();
    decorateSocket(clientTAO, socket, true);
    let onDisconnect = onConnect(clientTAO, socket.id);
    socket.on('disconnect', reason => {
      if (typeof onDisconnect === 'function') {
        onDisconnect(reason);
      }
      clientTAO = null;
      onDisconnect = null;
    });
  }
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
      decorateSocket(TAO, socket, true);
      return socket;
    }
  } else {
    const { onConnect } = opts;
    if (io && typeof io.of === 'function') {
      const namespacedEngine = io.of(`/${ns}`);
      namespacedEngine.use(ioMiddleware(TAO, onConnect));
    } else {
      return ioMiddleware(TAO, onConnect);
    }
  }
}
