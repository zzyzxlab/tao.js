const mockChannels = [];
const mockTransponders = [];
const mockTransceivers = [];
const mockTransponderSetCtx = jest.fn();

jest.mock('@tao.js/utils', () => ({
  Channel: jest.fn().mockImplementation(function Channel(tao, name) {
    this.tao = tao;
    this.name = name;
    this.addInlineHandler = jest.fn();
    this.removeInlineHandler = jest.fn();
    mockChannels.push(this);
  }),
  Transponder: jest
    .fn()
    .mockImplementation(function Transponder(channel, namer) {
      this.name = typeof namer === 'function' ? namer('request') : namer;
      this.setCtx = jest.fn((...args) => mockTransponderSetCtx(...args));
      this.setAppCtx = jest.fn();
      this.detach = jest.fn();
      mockTransponders.push(this);
    }),
  Transceiver: jest.fn().mockImplementation(function Transceiver(tao, namer) {
    this.name = typeof namer === 'function' ? namer('request') : namer;
    [
      'setCtx',
      'setAppCtx',
      'addInterceptHandler',
      'addAsyncHandler',
      'addInlineHandler',
      'removeInterceptHandler',
      'removeAsyncHandler',
      'removeInlineHandler',
    ].forEach((name) => {
      this[name] = jest.fn();
    });
    mockTransceivers.push(this);
  }),
}));

import taoMiddleware, { enhancedMiddleware, simpleMiddleware } from '../src';
import {
  chainFromRequest,
  cleanInput,
  noop,
  normalizeAC,
} from '../src/helpers';
import { Channel, Transponder, Transceiver } from '@tao.js/utils';

const next = jest.fn();

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const PARENT_ID = 'b7ad6b7169203331';
const TRACEPARENT = `00-${TRACE_ID}-${PARENT_ID}-01`;
const TRACE_CHAIN = { taoTrace: { traceId: TRACE_ID, signalId: PARENT_ID } };

describe('@tao.js/koa helpers', () => {
  it('normalizes trigram aliases and removes absent parts', () => {
    expect(normalizeAC({ t: 'User', action: 'View', o: 'Web' })).toEqual({
      term: 'User',
      action: 'View',
      orient: 'Web',
    });
    expect(
      cleanInput({ term: 'User', action: null, orient: undefined }),
    ).toEqual({
      term: 'User',
    });
    expect(noop()).toBeUndefined();
  });

  describe('chainFromRequest', () => {
    it('continues a valid traceparent header as taoTrace chain state', () => {
      expect(
        chainFromRequest({
          request: { headers: { traceparent: TRACEPARENT } },
        }),
      ).toEqual({
        taoTrace: { traceId: TRACE_ID, signalId: PARENT_ID },
      });
    });

    it('yields null when the header is absent', () => {
      expect(chainFromRequest({ request: { headers: {} } })).toBeNull();
    });

    it('yields null when the request shape has no headers', () => {
      expect(chainFromRequest(undefined)).toBeNull();
      expect(chainFromRequest({})).toBeNull();
      expect(chainFromRequest({ request: {} })).toBeNull();
    });

    it('yields null for malformed traceparent headers', () => {
      const malformed = [
        'garbage',
        `00-${'0'.repeat(32)}-${PARENT_ID}-01`, // all-zero trace id
        `00-${TRACE_ID}-${'0'.repeat(16)}-01`, // all-zero parent id
        `ff-${TRACE_ID}-${PARENT_ID}-01`, // forbidden version
        `00-${TRACE_ID.slice(1)}-${PARENT_ID}-01`, // short trace id
      ];
      for (const traceparent of malformed) {
        expect(
          chainFromRequest({ request: { headers: { traceparent } } }),
        ).toBeNull();
      }
    });
  });
});

describe('@tao.js/koa simple and enhanced middleware', () => {
  beforeEach(() => {
    mockChannels.length = 0;
    mockTransponders.length = 0;
    mockTransceivers.length = 0;
    next.mockClear();
    mockTransponderSetCtx.mockReset();
    Channel.mockClear();
    Transponder.mockClear();
    Transceiver.mockClear();
  });

  it('adds simple response handlers and exposes a transient TAO context', async () => {
    const middleware = simpleMiddleware({}, { name: 'api', timeout: 10 });
    const handler = jest.fn();
    middleware.addResponseHandler(
      { t: ['User', 'Account'], a: 'View' },
      handler,
    );
    middleware.removeResponseHandler({ term: 'User', action: 'View' }, handler);
    const channel = mockChannels[0];
    expect(channel.addInlineHandler).toHaveBeenCalledTimes(2);
    expect(channel.addInlineHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );
    expect(channel.addInlineHandler).toHaveBeenCalledWith(
      { term: 'Account', action: 'View' },
      handler,
    );
    expect(channel.removeInlineHandler).toHaveBeenCalledTimes(1);
    expect(channel.removeInlineHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );
    expect(channel.name('req')).toBe('api-channel-req');

    const ctx = {};
    await middleware.middleware()(ctx, next);
    const transponder = mockTransponders[0];
    expect(transponder.name).toBe('api-transponder-request');
    expect(Transponder.mock.calls[0][2]).toBe(10);
    expect(next).toHaveBeenCalled();
    expect(transponder.detach).toHaveBeenCalled();
    expect(ctx.tao).toBeNull();
  });

  it('falls back to default channel naming and transponder timeout when no options are given', () => {
    const handler = jest.fn();
    const middleware = simpleMiddleware({}, {});
    middleware.addResponseHandler({ t: 'User', a: 'View', o: 'Web' }, handler);
    const channel = mockChannels[mockChannels.length - 1];
    expect(channel.name('req')).toBe('koa-simple-middleware-channel-req');

    const ctx = {};
    middleware.middleware()(ctx, next);
    expect(Transponder.mock.calls[Transponder.mock.calls.length - 1][2]).toBe(
      3000,
    );
  });

  it('only logs matched trigrams for the simple middleware when debug is enabled', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = jest.fn();

    simpleMiddleware({}, {}).addResponseHandler(
      { t: 'User', a: 'View', o: 'Web' },
      handler,
    );
    expect(log).not.toHaveBeenCalled();

    simpleMiddleware({}, { debug: true }).addResponseHandler(
      { t: 'User', a: 'View', o: 'Web' },
      handler,
    );
    expect(log).toHaveBeenCalledWith(
      '@tao.js/koa::addResponseHandler::trigram:',
      { term: 'User', action: 'View', orient: 'Web' },
    );
    log.mockRestore();
  });

  it('delegates all enhanced handler phases and request context calls', () => {
    const middleware = enhancedMiddleware({}, { name: 'api' });
    const handler = jest.fn();
    [
      'addInterceptHandler',
      'addAsyncHandler',
      'addInlineHandler',
      'removeInterceptHandler',
      'removeAsyncHandler',
      'removeInlineHandler',
    ].forEach((method) =>
      middleware[method]({ t: 'User', a: 'View' }, handler),
    );
    const transceiver = mockTransceivers[0];
    expect(transceiver.name).toBe('api-transceiver-request');
    expect(Transceiver.mock.calls[0][2]).toBe(0);
    expect(transceiver.addInterceptHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );
    expect(transceiver.addAsyncHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );
    expect(transceiver.addInlineHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );
    expect(transceiver.removeInterceptHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );
    expect(transceiver.removeAsyncHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );
    expect(transceiver.removeInlineHandler).toHaveBeenCalledWith(
      { term: 'User', action: 'View' },
      handler,
    );

    const ctx = {};
    middleware.middleware()(ctx, next);
    expect(next).toHaveBeenCalled();
    expect(ctx.tao).toBeNull();
  });

  it('uses a custom transceiver timeout when provided', () => {
    enhancedMiddleware({}, { name: 'custom', timeout: 250 });
    expect(Transceiver.mock.calls[Transceiver.mock.calls.length - 1][2]).toBe(
      250,
    );
  });

  it('forwards both TAO context methods while middleware is active', () => {
    const simple = simpleMiddleware({}, { debug: true });
    const simpleCtx = { request: { headers: {} } };
    simple.middleware()(simpleCtx, () => {
      simpleCtx.tao.setCtx(
        { term: 'User', action: 'View', orient: 'Web' },
        { id: 1 },
      );
      simpleCtx.tao.setAppCtx({ key: 'user' });
    });
    expect(mockTransponders[0].setCtx).toHaveBeenCalledWith(
      { term: 'User', action: 'View', orient: 'Web' },
      { id: 1 },
      { chain: null },
    );
    expect(mockTransponders[0].setAppCtx).toHaveBeenCalledWith(
      { key: 'user' },
      { chain: null },
    );

    const enhanced = enhancedMiddleware({}, {});
    const enhancedCtx = { request: { headers: {} } };
    enhanced.middleware()(enhancedCtx, () => {
      enhancedCtx.tao.setCtx({ t: 'User', a: 'View', o: 'Web' }, {});
      enhancedCtx.tao.setAppCtx({ key: 'user' });
    });
    expect(mockTransceivers[0].setCtx).toHaveBeenCalledWith(
      { t: 'User', a: 'View', o: 'Web' },
      {},
      { chain: null },
    );
    expect(mockTransceivers[0].setAppCtx).toHaveBeenCalledWith(
      { key: 'user' },
      { chain: null },
    );
  });

  it('threads a traceparent header chain into transponder and transceiver entries', () => {
    const simple = simpleMiddleware({}, {});
    const simpleCtx = { request: { headers: { traceparent: TRACEPARENT } } };
    simple.middleware()(simpleCtx, () => {
      simpleCtx.tao.setCtx({ t: 'User', a: 'View', o: 'Web' }, { id: 1 });
      simpleCtx.tao.setAppCtx({ key: 'user' });
    });
    expect(mockTransponders[0].setCtx).toHaveBeenCalledWith(
      { t: 'User', a: 'View', o: 'Web' },
      { id: 1 },
      { chain: TRACE_CHAIN },
    );
    expect(mockTransponders[0].setAppCtx).toHaveBeenCalledWith(
      { key: 'user' },
      { chain: TRACE_CHAIN },
    );

    const enhanced = enhancedMiddleware({}, {});
    const enhancedCtx = { request: { headers: { traceparent: TRACEPARENT } } };
    enhanced.middleware()(enhancedCtx, () => {
      enhancedCtx.tao.setCtx({ t: 'User', a: 'View', o: 'Web' }, {});
      enhancedCtx.tao.setAppCtx({ key: 'user' });
    });
    expect(mockTransceivers[0].setCtx).toHaveBeenCalledWith(
      { t: 'User', a: 'View', o: 'Web' },
      {},
      { chain: TRACE_CHAIN },
    );
    expect(mockTransceivers[0].setAppCtx).toHaveBeenCalledWith(
      { key: 'user' },
      { chain: TRACE_CHAIN },
    );
  });
});

describe('@tao.js/koa HTTP middleware', () => {
  beforeEach(() => {
    mockChannels.length = 0;
    mockTransponders.length = 0;
    next.mockClear();
    mockTransponderSetCtx.mockReset();
    mockTransponderSetCtx.mockResolvedValue({
      unwrapCtx: () => ({ t: 'User', a: 'View', o: 'Web' }),
      data: { id: 1 },
    });
    Channel.mockClear();
    Transponder.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('serves only currently-registered response trigrams and validates every route', async () => {
    const api = taoMiddleware({}, { root: 'api' });
    const handler = jest.fn();
    api.addResponseHandler(
      { term: 'User', action: 'View', orient: 'Web' },
      handler,
    );
    api.removeResponseHandler(
      { term: 'User', action: 'View', orient: 'Web' },
      handler,
    );
    api.addResponseHandler({ t: 'User', a: 'View', o: 'Web' }, handler);
    api.addResponseHandler({ t: 'User', a: 'View', o: 'Web' }, handler);
    const middleware = api.middleware();

    const responses = { path: '/api/responses', method: 'GET', request: {} };
    await middleware(responses, next);
    expect(responses.body.responses).toEqual([
      { t: 'User', a: 'View', o: 'Web' },
    ]);

    api.removeResponseHandler({ t: 'User', a: 'View', o: 'Web' }, handler);
    const afterOneRemove = {
      path: '/api/responses',
      method: 'GET',
      request: {},
    };
    await middleware(afterOneRemove, next);
    expect(afterOneRemove.body.responses).toEqual([
      { t: 'User', a: 'View', o: 'Web' },
    ]);

    api.removeResponseHandler({ t: 'User', a: 'View', o: 'Web' }, handler);
    const afterBothRemoved = {
      path: '/api/responses',
      method: 'GET',
      request: {},
    };
    await middleware(afterBothRemoved, next);
    expect(afterBothRemoved.body.responses).toEqual([]);

    const wrongResponsesMethod = {
      path: '/api/responses',
      method: 'POST',
      request: {},
    };
    await middleware(wrongResponsesMethod, next);
    expect(wrongResponsesMethod.status).toBe(405);
    expect(wrongResponsesMethod.body).toBeUndefined();

    const wrongContextMethod = {
      path: '/api/context',
      method: 'GET',
      request: {},
    };
    await middleware(wrongContextMethod, next);
    expect(wrongContextMethod.status).toBe(405);

    const other = { path: '/other', method: 'GET', request: {} };
    await middleware(other, next);
    expect(other.status).toBeUndefined();

    const unknown = { path: '/api/unknown', method: 'GET', request: {} };
    await middleware(unknown, next);
    expect(unknown.status).toBe(404);

    const extra = { path: '/api/context/extra', method: 'POST', request: {} };
    await middleware(extra, next);
    expect(extra.status).toBe(400);
    expect(extra.body).toEqual({
      message: 'extra path parameters are not supported',
    });

    expect(next).toHaveBeenCalled();
  });

  it('matches the configured root case-insensitively', async () => {
    const api = taoMiddleware({}, { root: 'api' });
    const middleware = api.middleware();
    const ctx = { path: '/API/responses', method: 'GET', request: {} };
    await middleware(ctx, next);
    expect(ctx.status).toBeUndefined();
    expect(ctx.body.responses).toEqual([]);
  });

  it('returns 404 immediately for an empty route segment without evaluating extra path parameters', async () => {
    const api = taoMiddleware({}, { root: 'tao' });
    const middleware = api.middleware();
    const ctx = {
      path: { match: jest.fn(() => ['/tao//extra', '', 'extra']) },
      method: 'GET',
      request: {},
    };
    await middleware(ctx, next);
    expect(ctx.status).toBe(404);
    expect(ctx.body).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('only logs the initial channel handler activity when debug is enabled', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    taoMiddleware({}, {});
    const defaultChannel = mockChannels[mockChannels.length - 1];
    defaultChannel.addInlineHandler.mock.calls[0][1]({ t: 'User' }, { id: 1 });
    expect(log).not.toHaveBeenCalled();

    taoMiddleware({}, { debug: true });
    const debugChannel = mockChannels[mockChannels.length - 1];
    debugChannel.addInlineHandler.mock.calls[0][1]({ t: 'User' }, { id: 1 });
    expect(log).toHaveBeenCalledWith(
      'taoMiddleware::hitting the first with:',
      { t: 'User' },
      { id: 1 },
    );
    log.mockRestore();
  });

  it('logs matched trigrams and updated response trigram counts only when debug is enabled', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = jest.fn();

    taoMiddleware({}, {}).addResponseHandler(
      { t: 'User', a: 'View', o: 'Web' },
      handler,
    );
    expect(log).not.toHaveBeenCalled();

    taoMiddleware({}, { debug: true }).addResponseHandler(
      { t: 'User', a: 'View', o: 'Web' },
      handler,
    );
    expect(log).toHaveBeenCalledWith(
      '@tao.js/koa::addResponseHandler::trigram:',
      { term: 'User', action: 'View', orient: 'Web' },
    );
    expect(log).toHaveBeenCalledWith(
      '@tao.js/koa::addResponseHandler::responseTrigrams:',
      expect.any(Map),
    );
    log.mockRestore();
  });

  it('uses the configured or default context transponder timeout', async () => {
    const middleware = taoMiddleware({}, { timeout: 777 }).middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: { json: { tao: {}, data: {} } },
    };
    await middleware(ctx, next);
    expect(Transponder.mock.calls[Transponder.mock.calls.length - 1][2]).toBe(
      777,
    );

    const defaultMiddleware = taoMiddleware({}, {}).middleware();
    const defaultCtx = {
      path: '/tao/context',
      method: 'POST',
      request: { json: { tao: {}, data: {} } },
    };
    await defaultMiddleware(defaultCtx, next);
    expect(Transponder.mock.calls[Transponder.mock.calls.length - 1][2]).toBe(
      3000,
    );
  });

  it('reads request bodies, returns contexts, and records failures', async () => {
    const api = taoMiddleware({}, { json: 'payload' });
    const middleware = api.middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: {},
        payload: async () => ({ tao: { t: 'User' }, data: { id: 1 } }),
      },
    };
    await middleware(ctx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { id: 1 },
      { chain: null },
    );
    expect(ctx.body).toEqual({
      tao: { t: 'User', a: 'View', o: 'Web' },
      data: { id: 1 },
    });

    const failed = taoMiddleware({}, {}).middleware();
    mockTransponderSetCtx.mockRejectedValueOnce(new Error('nope'));
    const failedCtx = {
      path: '/tao/context',
      method: 'POST',
      request: { headers: {}, json: { tao: {}, data: {} } },
    };
    await failed(failedCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(failedCtx.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith('Error:', expect.any(Error));
  });

  it('prefers the configured body property over json and body fallbacks', async () => {
    const middleware = taoMiddleware({}, { json: 'payload' }).middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: {},
        payload: { tao: { t: 'User' }, data: { source: 'payload' } },
        json: { tao: { t: 'Other' }, data: { source: 'json' } },
        body: { tao: { t: 'Third' }, data: { source: 'body' } },
      },
    };
    await middleware(ctx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { source: 'payload' },
      { chain: null },
    );
  });

  it('does not read from a falsy body property key even when present on the request', async () => {
    const middleware = taoMiddleware({}, { json: '' }).middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: {},
        '': { tao: { t: 'Wrong' }, data: { source: 'emptyKey' } },
        json: { tao: { t: 'User' }, data: { source: 'json' } },
      },
    };
    await middleware(ctx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { source: 'json' },
      { chain: null },
    );
  });

  it('handles a body-less context POST without crashing', async () => {
    const middleware = taoMiddleware({}, {}).middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: { headers: {} },
    };
    await middleware(ctx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(undefined, undefined, {
      chain: null,
    });
    expect(ctx.status).toBeUndefined();
    expect(ctx.body).toEqual({
      tao: { t: 'User', a: 'View', o: 'Web' },
      data: { id: 1 },
    });
  });

  it('passes the traceparent header chain to the context transponder', async () => {
    const middleware = taoMiddleware({}, {}).middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: { traceparent: TRACEPARENT },
        json: { tao: { t: 'User' }, data: { id: 6 } },
      },
    };
    await middleware(ctx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { id: 6 },
      { chain: TRACE_CHAIN },
    );
  });

  it('falls back through json and body request fields', async () => {
    const middleware = taoMiddleware({}, {}).middleware();
    const jsonCtx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: {},
        json: async () => ({ tao: { t: 'User' }, data: { id: 2 } }),
      },
    };
    await middleware(jsonCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { id: 2 },
      { chain: null },
    );
    expect(jsonCtx.body.data).toEqual({ id: 1 });

    const bodyCtx = {
      path: '/tao/context',
      method: 'POST',
      request: { headers: {}, body: { tao: { t: 'User' }, data: { id: 3 } } },
    };
    await middleware(bodyCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { id: 3 },
      { chain: null },
    );
    expect(bodyCtx.body.data).toEqual({ id: 1 });
  });

  it('reads body values and functions, logs debug handlers, and handles missing routes', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const api = taoMiddleware({}, { debug: true, json: 'payload' });
    const channel = mockChannels[0];
    channel.addInlineHandler.mock.calls[0][1]({ t: 'User' }, { id: 1 });

    const handler = jest.fn();
    api.addResponseHandler({ t: 'User', a: 'View', o: 'Web' }, handler);
    api.removeResponseHandler({ t: 'Missing', a: 'View', o: 'Web' }, handler);
    expect(log).toHaveBeenCalledWith(
      '@tao.js/koa::addResponseHandler::responseTrigrams:',
      expect.any(Map),
    );

    const middleware = api.middleware();
    const valueCtx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: {},
        payload: { tao: { t: 'User' }, data: { id: 4 } },
      },
    };
    await middleware(valueCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { id: 4 },
      { chain: null },
    );
    expect(valueCtx.body.data).toEqual({ id: 1 });

    const bodyFnCtx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: {},
        body: async () => ({ tao: { t: 'User' }, data: { id: 5 } }),
      },
    };
    await middleware(bodyFnCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockTransponderSetCtx).toHaveBeenCalledWith(
      { t: 'User' },
      { id: 5 },
      { chain: null },
    );
    expect(bodyFnCtx.body.data).toEqual({ id: 1 });

    const noRouteCtx = {
      path: { match: jest.fn(() => ['/tao', undefined]) },
      method: 'GET',
      request: {},
    };
    await middleware(noRouteCtx, next);
    expect(noRouteCtx.status).toBe(404);
    log.mockRestore();
  });
});
