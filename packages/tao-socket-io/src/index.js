import { Kernel } from '@tao.js/core';

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

  if (IS_SERVER) {
    socket.on('disconnect', reason => {
      TAO.removeInlineHandler({}, socketHandler);
    });
  }
}

const ioMiddleware = (TAO, onConnect, disconnect) => (socket, next) => {
  decorateSocket(TAO, socket, !!onConnect);
  if (onConnect) {
    const onDisconnect = onConnect(TAO, onDisconnect);
    if (onDisconnect || disconnect) {
      socket.on('disconnect', reason => {
        if (typeof onDisconnect === 'function') {
          onDisconnect(reason);
        }
        if (typeof disconnect === 'function') {
          disconnect();
        }
      });
    }
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
