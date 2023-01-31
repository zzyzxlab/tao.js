import { Channel, Source } from '@tao.js/utils';

const DEFAULT_NAMESPACE = 'tao';
const IS_SERVER = typeof window === 'undefined';
const EMIT_EVENT = IS_SERVER ? 0 : 1;
const ON_EVENT = IS_SERVER ? 1 : 0;
const EVENTS = ['fromServer', 'fromClient'];

const NOOP = () => {};

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

function decorateSocket(TAO, socket) {
  socket.on(EVENTS[ON_EVENT], ({ tao, data }) => {
    TAO.setCtx(tao, data);
  });

  const handler = socketHandler(socket);
  TAO.addInlineHandler({}, handler);
  socket.on('disconnect', () => {
    TAO.removeInlineHandler({}, handler);
  });
}

const ioMiddleware = (TAO, onConnect) => (socket, next) => {
  let clientTAO = new Channel(TAO, socket.id);
  let onDisconnect = NOOP;
  decorateSocket(clientTAO, socket);
  if (onConnect && typeof onConnect === 'function') {
    onDisconnect = onConnect(clientTAO, socket.id);
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
    const { onConnect } = opts;
    if (io && typeof io.of === 'function') {
      const namespacedEngine = io.of(`/${ns}`);
      namespacedEngine.use(ioMiddleware(TAO, onConnect));
    } else {
      return ioMiddleware(TAO, onConnect);
    }
  }
}
