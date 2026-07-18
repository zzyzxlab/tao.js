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
  Transponder: jest.fn().mockImplementation(function Transponder() {
    this.setCtx = jest.fn((...args) => mockTransponderSetCtx(...args));
    this.setAppCtx = jest.fn();
    this.detach = jest.fn();
    mockTransponders.push(this);
  }),
  Transceiver: jest.fn().mockImplementation(function Transceiver() {
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
import { cleanInput, noop, normalizeAC } from '../src/helpers';

const next = jest.fn();

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
});

describe('@tao.js/koa simple and enhanced middleware', () => {
  beforeEach(() => {
    mockChannels.length = 0;
    mockTransponders.length = 0;
    mockTransceivers.length = 0;
    next.mockClear();
    mockTransponderSetCtx.mockReset();
  });

  it('adds simple response handlers and exposes a transient TAO context', () => {
    const middleware = simpleMiddleware({}, { name: 'api', timeout: 10 });
    const handler = jest.fn();
    middleware.addResponseHandler(
      { t: ['User', 'Account'], a: 'View' },
      handler,
    );
    middleware.removeResponseHandler({ term: 'User', action: 'View' }, handler);
    const channel = mockChannels[0];
    expect(channel.addInlineHandler).toHaveBeenCalledTimes(2);
    expect(channel.removeInlineHandler).toHaveBeenCalledTimes(1);

    const ctx = {};
    middleware.middleware()(ctx, next);
    const transponder = mockTransponders[0];
    expect(next).toHaveBeenCalled();
    expect(transponder.detach).toHaveBeenCalled();
    expect(ctx.tao).toBeNull();
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
    expect(transceiver.addInterceptHandler).toHaveBeenCalledWith(
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

  it('forwards both TAO context methods while middleware is active', () => {
    const simple = simpleMiddleware({}, { debug: true });
    const simpleCtx = {};
    simple.middleware()(simpleCtx, () => {
      simpleCtx.tao.setCtx(
        { term: 'User', action: 'View', orient: 'Web' },
        { id: 1 },
      );
      simpleCtx.tao.setAppCtx({ key: 'user' });
    });
    expect(mockTransponders[0].setCtx).toHaveBeenCalled();
    expect(mockTransponders[0].setAppCtx).toHaveBeenCalled();

    const enhanced = enhancedMiddleware({}, {});
    const enhancedCtx = {};
    enhanced.middleware()(enhancedCtx, () => {
      enhancedCtx.tao.setCtx({ t: 'User', a: 'View', o: 'Web' }, {});
      enhancedCtx.tao.setAppCtx({ key: 'user' });
    });
    expect(mockTransceivers[0].setCtx).toHaveBeenCalled();
    expect(mockTransceivers[0].setAppCtx).toHaveBeenCalled();
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('serves registered response trigrams and validates routes', async () => {
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
    const middleware = api.middleware();

    const responses = { path: '/api/responses', method: 'GET', request: {} };
    await middleware(responses, next);
    expect(responses.body.responses).toEqual([
      { t: 'User', a: 'View', o: 'Web' },
    ]);

    for (const ctx of [
      { path: '/other', method: 'GET', request: {} },
      { path: '/api/responses', method: 'POST', request: {} },
      { path: '/api/context', method: 'GET', request: {} },
      { path: '/api/unknown', method: 'GET', request: {} },
      { path: '/api/context/extra', method: 'POST', request: {} },
    ]) {
      await middleware(ctx, next);
    }
    expect(next).toHaveBeenCalled();
  });

  it('reads request bodies, returns contexts, and records failures', async () => {
    const api = taoMiddleware({}, { json: 'payload' });
    const middleware = api.middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        payload: async () => ({ tao: { t: 'User' }, data: { id: 1 } }),
      },
    };
    await middleware(ctx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ctx.body).toEqual({
      tao: { t: 'User', a: 'View', o: 'Web' },
      data: { id: 1 },
    });

    const failed = taoMiddleware({}, {}).middleware();
    mockTransponderSetCtx.mockRejectedValueOnce(new Error('nope'));
    const failedCtx = {
      path: '/tao/context',
      method: 'POST',
      request: { json: { tao: {}, data: {} } },
    };
    await failed(failedCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(failedCtx.status).toBe(500);
  });

  it('falls back through json and body request fields', async () => {
    const middleware = taoMiddleware({}, {}).middleware();
    const jsonCtx = {
      path: '/tao/context',
      method: 'POST',
      request: { json: async () => ({ tao: { t: 'User' }, data: { id: 2 } }) },
    };
    await middleware(jsonCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(jsonCtx.body.data).toEqual({ id: 1 });

    const bodyCtx = {
      path: '/tao/context',
      method: 'POST',
      request: { body: { tao: { t: 'User' }, data: { id: 3 } } },
    };
    await middleware(bodyCtx, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bodyCtx.body.data).toEqual({ id: 1 });
  });
});
