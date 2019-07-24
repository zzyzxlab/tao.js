// import { Kernel } from '@tao.js/core';
import { Channel, Source } from '@tao.js/utils';

const DEFAULT_NAMESPACE = 'tao';
const SOURCE_PROP = '__$source$__';
const SOCKET_SOURCE = 'SOCKET';
const IS_SERVER = typeof window === 'undefined';
const EMIT_EVENT = IS_SERVER ? 0 : 1;
const ON_EVENT = IS_SERVER ? 1 : 0;
const EVENTS = ['fromServer', 'fromClient'];

const socketHandler = socket => (tao, data) => {
  if (IS_SERVER) {
    socket.emit(EVENTS[EMIT_EVENT], { tao, data });
  } else {
    if (!data[tao.o] || data[tao.o][SOURCE_PROP] !== SOCKET_SOURCE) {
      // console.log(`sending to socket[${socket.id}]:`, tao);
      socket.emit(EVENTS[EMIT_EVENT], { tao, data });
    }
  }
};

function decorateNetwork(TAO, socket) {
  const fromHandler = handler =>
    socket.on(EVENTS[ON_EVENT], ({ tao, data }) => handler(tao, data));
  const toEmit = (tao, data) => socket.emit(EVENTS[EMIT_EVENT], { tao, data });
  const source = new Source(TAO, fromHandler, toEmit);
  return source;
}

function decorateSocket(TAO, socket, forwardACs) {
  console.log('TAO is instanceof Channel:', TAO instanceof Channel);
  socket.on(EVENTS[ON_EVENT], ({ tao, data }) => {
    // console.log(`socket[${socket.id}] received event:`, tao);
    // if (!forwardACs) {
    // if (IS_SERVER) {
    TAO.setCtx(tao, data);
    //   return;
    // }
    // const datum = Object.assign({}, data);
    // if (!datum[tao.o]) {
    //   datum[tao.o] = {};
    // }
    // datum[tao.o][SOURCE_PROP] = SOCKET_SOURCE;
    // TAO.setCtx(tao, datum);
  });

  if (IS_SERVER) {
    // if (forwardACs) {
    const handler = socketHandler(socket);
    TAO.addInlineHandler({}, handler);
    socket.on('disconnect', () => {
      TAO.removeInlineHandler({}, handler);
    });
    // }
  } else {
    TAO.addAsyncHandler({}, socketHandler(socket));
  }
}

const ioMiddleware = (TAO, onConnect) => (socket, next) => {
  if (onConnect && typeof onConnect === 'function') {
    // let clientTAO = new Kernel();
    // let clientTAO = TAO.clone();
    let clientTAO = new Channel(TAO, socket.id);
    decorateSocket(clientTAO, socket, true);
    let onDisconnect = onConnect(clientTAO, socket.id);
    socket.on('disconnect', reason => {
      if (typeof onDisconnect === 'function') {
        onDisconnect(reason);
      }
      clientTAO = null;
      onDisconnect = null;
    });
  } else {
    decorateSocket(TAO, socket);
  }

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
      // decorateSocket(TAO, socket, true);
      // let source = new Source(TAO);
      // decorateSocket(source, socket, true);
      const source = decorateNetwork(TAO, socket);
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
