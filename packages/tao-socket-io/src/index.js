import { Channel, Source } from '@tao.js/utils';

const DEFAULT_NAMESPACE = 'tao';
const IS_SERVER = typeof window === 'undefined';
const EMIT_EVENT = IS_SERVER ? 0 : 1;
const ON_EVENT = IS_SERVER ? 1 : 0;
const EVENTS = ['fromServer', 'fromClient'];

const NOOP = () => {};
const IDENTITY = v => v;

const socketHandler = socket => (tao, data) => {
  socket.emit(EVENTS[EMIT_EVENT], { tao, data });
};

function decorateNetwork(TAO, socket) {
  const fromHandler = handler =>
    socket.on(EVENTS[ON_EVENT], ({ tao, data }) => handler(tao, data));
  const toEmit = (tao, data) => socket.emit(EVENTS[EMIT_EVENT], { tao, data });
  const source = new Source(TAO, toEmit, fromHandler);
  return source;
}

function onEventPlain(TAO) {
  return ({ tao, data }) => TAO.setCtx(tao, data);
}

function onEventAuth(TAO, auth, authTransform) {
  return async ({ tao, data }) => {
    const useData = await authTransform(tao, data, auth);
    TAO.setCtx(tao, useData);
  };
}

function decorateSocket(TAO, socket, authTransform) {
  const { auth } = socket.handshake;
  if (typeof authTransform === 'function') {
    socket.on(EVENTS[ON_EVENT], onEventAuth(TAO, auth, authTransform));
  } else {
    socket.on(EVENTS[ON_EVENT], onEventPlain(TAO));
  }

  const handler = socketHandler(socket);
  TAO.addInlineHandler({}, handler);
  socket.on('disconnect', () => {
    TAO.removeInlineHandler({}, handler);
  });
}

// change, options object now instead of just onConnect
const ioMiddleware = (TAO, { onConnect, authTransform } = {}) => (
  socket,
  next
) => {
  let clientTAO = new Channel(TAO, socket.id);
  let onDisconnect = NOOP;
  decorateSocket(clientTAO, socket, authTransform);
  if (onConnect && typeof onConnect === 'function') {
    // change: pass the whole socket to onConnect
    onDisconnect = onConnect(clientTAO, socket);
    onDisconnect = typeof onDisconnect === 'function' ? onDisconnect : NOOP;
  }
  socket.on('disconnect', reason => {
    onDisconnect(reason);
    clientTAO = null;
    onDisconnect = null;
  });

  if (next && typeof next === 'function') {
    return next();
  }
};

export default function wireTaoJsToSocketIO(TAO, io, opts = {}) {
  const ns = opts.namespace || opts.ns || DEFAULT_NAMESPACE;
  if (!IS_SERVER) {
    if (io && typeof io === 'function') {
      const host = opts.host || '';
      const socket = io(`${host}/${ns}`, opts.io);
      const source = decorateNetwork(TAO, socket);
      return socket;
    }
  } else {
    const { onConnect, authTransform } = opts;
    if (io && typeof io.of === 'function') {
      const namespacedEngine = io.of(`/${ns}`);
      namespacedEngine.use(ioMiddleware(TAO, { onConnect, authTransform }));
    } else {
      return ioMiddleware(TAO, { onConnect, authTransform });
    }
  }
}
