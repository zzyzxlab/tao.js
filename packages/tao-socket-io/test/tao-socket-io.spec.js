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

describe('@tao.js/socket.io', () => {
  beforeEach(() => {
    mockSources.length = 0;
    mockChannels.length = 0;
  });

  it('wires a browser socket to a source using configured namespace', () => {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {},
    });
    let wireTaoJsToSocketIO;
    jest.isolateModules(() => {
      wireTaoJsToSocketIO = require('../src').default;
    });
    delete global.window;
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
    expect(wireTaoJsToSocketIO(tao, null)).toBeUndefined();
  });

  it('wires server middleware, authenticates inbound data, and cleans up', async () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(global, 'window');
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });
    let wireTaoJsToSocketIO;
    jest.isolateModules(() => {
      wireTaoJsToSocketIO = require('../src').default;
    });
    if (windowDescriptor) {
      Object.defineProperty(global, 'window', windowDescriptor);
    } else {
      delete global.window;
    }

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

    const fallback = wireTaoJsToSocketIO({}, null);
    expect(fallback).toBeInstanceOf(Function);
  });

  it('accepts unauthenticated server events and supports middleware without next', () => {
    const socket = makeSocket();
    const fallback = require('../src').default({}, null);
    fallback(socket);
    const channel = mockChannels[0];
    socket.events.fromClient({ tao: { t: 'Public' }, data: { id: 2 } });
    expect(channel.setCtx).toHaveBeenCalledWith({ t: 'Public' }, { id: 2 });
  });
});
