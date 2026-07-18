const mockSources = [];
const mockChannels = [];

jest.mock('@tao.js/utils', () => ({
  Source: jest.fn().mockImplementation(function Source(tao, emit, listen) {
    this.tao = tao;
    this.emit = emit;
    this.listen = listen;
    mockSources.push(this);
  }),
  Channel: jest.fn().mockImplementation(function Channel(tao, id) {
    this.tao = tao;
    this.id = id;
    this.setCtx = jest.fn();
    this.addInlineHandler = jest.fn();
    this.removeInlineHandler = jest.fn();
    mockChannels.push(this);
  }),
}));

function makeSocket() {
  const events = {};
  return {
    id: 'client-1',
    handshake: { auth: { token: 'secret' } },
    events,
    emit: jest.fn(),
    on: jest.fn((event, handler) => {
      const previous = events[event];
      events[event] = previous
        ? (...args) => {
            previous(...args);
            return handler(...args);
          }
        : handler;
    }),
  };
}

function loadWire({ browser } = {}) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(global, 'window');
  if (browser) {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {},
    });
  } else {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });
  }

  let wireTaoJsToSocketIO;
  jest.isolateModules(() => {
    wireTaoJsToSocketIO = require('../src').default;
  });

  if (windowDescriptor) {
    Object.defineProperty(global, 'window', windowDescriptor);
  } else {
    delete global.window;
  }

  return wireTaoJsToSocketIO;
}

describe('@tao.js/socket.io', () => {
  beforeEach(() => {
    mockSources.length = 0;
    mockChannels.length = 0;
  });

  describe('browser client (window defined)', () => {
    it('wires a socket Source with host, namespace, and io options', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: true });
      const socket = makeSocket();
      const io = jest.fn(() => socket);
      const tao = {};

      expect(
        wireTaoJsToSocketIO(tao, io, {
          namespace: 'events',
          host: 'https://example.test',
          io: { transports: ['websocket'] },
        }),
      ).toBe(socket);
      expect(io).toHaveBeenCalledWith('https://example.test/events', {
        transports: ['websocket'],
      });
      expect(mockSources).toHaveLength(1);

      mockSources[0].emit({ t: 'User' }, { id: 1 });
      expect(socket.emit).toHaveBeenCalledWith('fromClient', {
        tao: { t: 'User' },
        data: { id: 1 },
      });
      const received = jest.fn();
      mockSources[0].listen(received);
      socket.events.fromServer({ tao: { t: 'User' }, data: { id: 2 } });
      expect(received).toHaveBeenCalledWith({ t: 'User' }, { id: 2 });
    });

    it('defaults host to empty string and namespace to tao', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: true });
      const socket = makeSocket();
      const io = jest.fn(() => socket);

      wireTaoJsToSocketIO({}, io);
      expect(io).toHaveBeenCalledWith('/tao', undefined);
    });

    it('returns undefined when io is not a client factory function', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: true });
      expect(wireTaoJsToSocketIO({}, null)).toBeUndefined();
      expect(wireTaoJsToSocketIO({}, { of: jest.fn() })).toBeUndefined();
    });
  });

  describe('server (no window)', () => {
    it('attaches namespaced middleware with authTransform and onConnect cleanup', async () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const socket = makeSocket();
      const use = jest.fn();
      const io = { of: jest.fn(() => ({ use })) };
      const onDisconnect = jest.fn();
      const transform = jest.fn(async (tao, data, auth) => ({
        ...data,
        auth,
      }));

      wireTaoJsToSocketIO({}, io, {
        ns: 'private',
        authTransform: transform,
        onConnect: jest.fn(() => onDisconnect),
      });
      expect(io.of).toHaveBeenCalledWith('/private');
      const middleware = use.mock.calls[0][0];
      const next = jest.fn();
      middleware(socket, next);
      expect(next).toHaveBeenCalled();

      const channel = mockChannels[0];
      await socket.events.fromClient({ tao: { t: 'User' }, data: { id: 1 } });
      expect(transform).toHaveBeenCalledWith(
        { t: 'User' },
        { id: 1 },
        { token: 'secret' },
      );
      expect(channel.setCtx).toHaveBeenCalledWith(
        { t: 'User' },
        { id: 1, auth: { token: 'secret' } },
      );
      const outbound = channel.addInlineHandler.mock.calls[0][1];
      outbound({ t: 'User' }, { id: 3 });
      expect(socket.emit).toHaveBeenCalledWith('fromServer', {
        tao: { t: 'User' },
        data: { id: 3 },
      });
      socket.events.disconnect('gone');
      expect(channel.removeInlineHandler).toHaveBeenCalled();
      expect(onDisconnect).toHaveBeenCalledWith('gone');
    });

    it('returns middleware when io has no of(), and treats non-function onConnect cleanup as NOOP', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const socket = makeSocket();
      const onConnect = jest.fn(() => 'not-a-function');
      const middleware = wireTaoJsToSocketIO({}, null, { onConnect });
      expect(middleware).toBeInstanceOf(Function);

      middleware(socket);
      expect(onConnect).toHaveBeenCalledWith(mockChannels[0], socket);
      expect(() => socket.events.disconnect('bye')).not.toThrow();
    });

    it('returns middleware when io.of exists but is not a function', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const middleware = wireTaoJsToSocketIO({}, { of: 'not-a-function' });
      expect(middleware).toBeInstanceOf(Function);
      expect(() => middleware(makeSocket())).not.toThrow();
    });

    it('accepts plain inbound events without authTransform', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO({}, null);
      middleware(socket);
      socket.events.fromClient({ tao: { t: 'Public' }, data: { id: 2 } });
      expect(mockChannels[0].setCtx).toHaveBeenCalledWith(
        { t: 'Public' },
        { id: 2 },
      );
    });

    it('skips onConnect when it is not a function', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO({}, null, { onConnect: true });
      expect(() => middleware(socket, 'not-a-fn')).not.toThrow();
    });
  });
});
