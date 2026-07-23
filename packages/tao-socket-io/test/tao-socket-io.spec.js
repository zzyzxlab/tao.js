const mockChannels = [];
const mockTransports = [];
const mockUndecorate = jest.fn();

jest.mock('@tao.js/utils', () => {
  const actual = jest.requireActual('@tao.js/utils');
  return {
    ...actual,
    Channel: jest.fn().mockImplementation(function Channel(tao, id) {
      this.tao = tao;
      this.id = id;
      this.enter = jest.fn();
      this.decorations = [];
      this.decorate = jest.fn((spec) => {
        this.decorations.push(spec);
        return mockUndecorate;
      });
      mockChannels.push(this);
    }),
    createTransport: jest.fn((kernel, opts) => {
      const transport = {
        kernel,
        opts,
        name: 'MOCK-TRANSPORT',
        receive: jest.fn(),
        dispose: jest.fn(),
      };
      mockTransports.push(transport);
      return transport;
    }),
  };
});

import { AppCtx } from '@tao.js/core';
import { Channel, createTransport } from '@tao.js/utils';

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
    mockChannels.length = 0;
    mockTransports.length = 0;
    mockUndecorate.mockClear();
    Channel.mockClear();
    createTransport.mockClear();
  });

  describe('browser client (window defined)', () => {
    it('wires a duplex transport with host, namespace, and io options', () => {
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
      expect(createTransport).toHaveBeenCalledTimes(1);
      const [kernel, opts] = createTransport.mock.calls[0];
      expect(kernel).toBe(tao);

      // outbound: every hop is emitted with its wire envelope (§9)
      opts.send(
        { t: 'User' },
        { id: 1 },
        { v: 1, chain: { taoTrace: { traceId: 'abc' } } },
      );
      expect(socket.emit).toHaveBeenCalledWith('fromClient', {
        tao: { t: 'User' },
        data: { id: 1 },
        envelope: { v: 1, chain: { taoTrace: { traceId: 'abc' } } },
      });

      // inbound: 'fromServer' payloads go through transport.receive with the
      // wire envelope so the chain continues through the local reducers
      const transport = mockTransports[0];
      socket.events.fromServer({
        tao: { t: 'User' },
        data: { id: 2 },
        envelope: { v: 1, chain: { taoTrace: { traceId: 'abc' } } },
      });
      expect(transport.receive).toHaveBeenCalledWith(
        { t: 'User' },
        { id: 2 },
        { v: 1, chain: { taoTrace: { traceId: 'abc' } } },
      );

      // pre-0.20 server payloads have no envelope property; receive treats it
      // as absent (one-sided backward compatibility)
      socket.events.fromServer({ tao: { t: 'User' }, data: { id: 3 } });
      expect(transport.receive).toHaveBeenLastCalledWith(
        { t: 'User' },
        { id: 3 },
        undefined,
      );
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
      expect(createTransport).not.toHaveBeenCalled();
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
      expect(channel.id).toBe('client-1');

      // inbound signals enter the client Channel with the continued chain
      await socket.events.fromClient({
        tao: { t: 'User', a: 'Add', o: 'Test' },
        data: { id: 1 },
        envelope: {
          v: 1,
          chain: { taoTrace: { traceId: 'abc', signalId: 'def' } },
        },
      });
      expect(transform).toHaveBeenCalledWith(
        { t: 'User', a: 'Add', o: 'Test' },
        { id: 1 },
        { token: 'secret' },
      );
      expect(channel.enter).toHaveBeenCalledTimes(1);
      const [enteredAc, enterOpts] = channel.enter.mock.calls[0];
      expect(enteredAc.unwrapCtx()).toEqual({ t: 'User', a: 'Add', o: 'Test' });
      expect(enteredAc.data).toEqual({
        User: { id: 1, auth: { token: 'secret' } },
      });
      expect(enterOpts).toEqual({
        hop: { source: 'socket:client-1' },
        chain: { taoTrace: { traceId: 'abc', signalId: 'def' } },
      });

      // reply path: a veto-respecting onProceed decoration on the Channel
      expect(channel.decorate).toHaveBeenCalledTimes(1);
      const decoration = channel.decorations[0];
      expect(decoration.name).toBe('socket:client-1');
      expect(decoration.onProceed).toBeInstanceOf(Function);

      // an emitted reply carries the dispatch envelope's chain as {v:1, chain}
      const replyAc = new AppCtx('User', 'Added', 'Test', { User: { id: 3 } });
      const dispatchEnvelope = {
        cascade: { channelId: 'client-1' },
        hop: { via: 'Inline' },
        chain: {
          taoTrace: { traceId: 'abc', signalId: 'ghi', parentId: 'def' },
        },
      };
      decoration.onProceed(replyAc, dispatchEnvelope);
      expect(socket.emit).toHaveBeenCalledWith('fromServer', {
        tao: { t: 'User', a: 'Added', o: 'Test' },
        data: { User: { id: 3 } },
        envelope: {
          v: 1,
          chain: {
            taoTrace: { traceId: 'abc', signalId: 'ghi', parentId: 'def' },
          },
        },
      });

      socket.events.disconnect('gone');
      expect(mockUndecorate).toHaveBeenCalledTimes(1);
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
      expect(mockUndecorate).toHaveBeenCalledTimes(1);
    });

    it('returns middleware when io.of exists but is not a function', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const middleware = wireTaoJsToSocketIO({}, { of: 'not-a-function' });
      expect(middleware).toBeInstanceOf(Function);
      expect(() => middleware(makeSocket())).not.toThrow();
    });

    it('accepts plain inbound events without authTransform, with verbose trigrams and continued chains', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO({}, null);
      middleware(socket);
      socket.events.fromClient({
        tao: { term: 'Public', action: 'Read', orient: 'Feed' },
        data: { id: 2 },
        envelope: { v: 1, chain: { taoTrace: { traceId: 'xyz' } } },
      });
      const channel = mockChannels[0];
      const [ac, opts] = channel.enter.mock.calls[0];
      expect(ac.unwrapCtx()).toEqual({ t: 'Public', a: 'Read', o: 'Feed' });
      expect(ac.data).toEqual({ Public: { id: 2 } });
      expect(opts).toEqual({
        hop: { source: 'socket:client-1' },
        chain: { taoTrace: { traceId: 'xyz' } },
      });
    });

    it('still dispatches inbound payloads without an envelope property (pre-0.20 client)', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO({}, null);
      middleware(socket);
      socket.events.fromClient({
        tao: { t: 'Public', a: 'Read', o: 'Feed' },
        data: { id: 9 },
      });
      const channel = mockChannels[0];
      expect(channel.enter).toHaveBeenCalledTimes(1);
      const [ac, opts] = channel.enter.mock.calls[0];
      expect(ac.unwrapCtx()).toEqual({ t: 'Public', a: 'Read', o: 'Feed' });
      // absent wire envelope enters with a fresh chain
      expect(opts).toEqual({
        hop: { source: 'socket:client-1' },
        chain: null,
      });
    });

    it('skips onConnect when it is not a function', () => {
      const wireTaoJsToSocketIO = loadWire({ browser: false });
      const socket = makeSocket();
      const middleware = wireTaoJsToSocketIO({}, null, { onConnect: true });
      expect(() => middleware(socket, 'not-a-fn')).not.toThrow();
    });
  });
});
