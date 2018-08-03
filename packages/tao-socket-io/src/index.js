// import TAO from '@tao.js/core';
import { Kernel } from '@tao.js/core';

function noop() {}

const DEFAULT_NAMESPACE = 'tao';
const SOURCE_PROP = '__$source$__';
const SOCKET_SOURCE = 'SOCKET';
const IS_SERVER = typeof window === 'undefined';
const EMIT_EVENT = IS_SERVER ? 0 : 1;
const ON_EVENT = IS_SERVER ? 1 : 0;
const EVENTS = ['fromServer', 'fromClient'];

function decorateSocket(TAO, socket, forwardACs) {
  socket.on(EVENTS[ON_EVENT], ({ tao, data }) => {
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

  const socketHandler = (tao, data) => {
    if (!data[tao.o] || data[tao.o][SOURCE_PROP] !== SOCKET_SOURCE) {
      socket.emit(EVENTS[EMIT_EVENT], { tao, data });
    }
  };

  if (IS_SERVER) {
    if (forwardACs) {
      TAO.addInlineHandler({}, socketHandler);
    }
  } else {
    TAO.addAsyncHandler({}, socketHandler);
  }

  const disconnectCallbacks = [];
  const registerDisconnectCallback = !IS_SERVER
    ? noop
    : cb => {
        console.log('adding disconnect cb');
        disconnectCallbacks.push(cb);
      };

  if (IS_SERVER) {
    socket.on('disconnect', reason => {
      console.log('disconnecting socket w reason:', reason);
      // if (reason === 'client') {
      TAO.removeInlineHandler({}, socketHandler);
      console.log('disconnectCallbacks.length:', disconnectCallbacks.length);
      if (disconnectCallbacks.length) {
        console.log('cycling thru disconnect callbacks');
        disconnectCallbacks.forEach(cb => cb());
      }
      // }
    });
  }
  return registerDisconnectCallback;
}

const ioMiddleware = (TAO, onConnect, disconnect) => (socket, next) => {
  const onDisconnect = decorateSocket(TAO, socket, !!onConnect);
  if (onConnect) {
    onConnect(TAO, onDisconnect);
    onDisconnect(disconnect);
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
      decorateSocket(TAO, socket, true);
      return socket;
    }
  } else {
    const { onConnect } = opts;
    if (io && typeof io.of === 'function') {
      const namespacedEngine = io.of(`/${ns}`);
      if (onConnect && typeof onConnect === 'function') {
        let clientTAO = new Kernel();
        namespacedEngine.use(
          ioMiddleware(clientTAO, onConnect, () => (clientTAO = null))
        );
      }
      namespacedEngine.use(ioMiddleware(TAO));
    } else {
      return ioMiddleware(TAO);
    }
  }
}
