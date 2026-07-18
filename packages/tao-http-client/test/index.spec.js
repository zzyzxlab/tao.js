const mockFetchClient = jest.fn();

jest.mock('../src/fetchclient', () => ({
  __esModule: true,
  default: (...args) => mockFetchClient(...args),
}));
jest.mock('src/helpers/debug', () => () => jest.fn(), { virtual: true });
jest.mock(
  'query-string',
  () => ({
    __esModule: true,
    default: {
      stringify: (params) =>
        Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&'),
    },
  }),
  { virtual: true },
);

import TaoHttpClient from '../src';
import request from '../src/request';
import {
  buildApiUrl,
  makeQueryString,
  normalizePathPart,
} from '../src/url-helpers';

function response({
  status = 200,
  statusText = 'OK',
  contentLength,
  contentType = 'application/json',
  json,
  text,
  blob,
} = {}) {
  const values = {
    'content-type': contentType,
    ...(contentLength === undefined
      ? {}
      : { 'content-length': String(contentLength) }),
  };
  return {
    status,
    statusText,
    headers: {
      get: jest.fn((name) => values[name]),
      has: jest.fn((name) =>
        Object.prototype.hasOwnProperty.call(values, name),
      ),
    },
    json: jest.fn(async () => json),
    text: jest.fn(async () => text),
    blob: jest.fn(async () => blob),
  };
}

describe('@tao.js/http-client URL helpers', () => {
  it('serializes parameters and normalizes path components', () => {
    expect(makeQueryString({ q: 'tao', filter: { active: true } })).toBe(
      'q=tao&filter=%7B%22active%22%3Atrue%7D',
    );
    expect(normalizePathPart()).toBe('');
    expect(normalizePathPart('v1/')).toBe('/v1');
    expect(normalizePathPart('/tao')).toBe('/tao');
    const log = jest.fn();
    expect(
      buildApiUrl({
        protocol: 'https',
        host: 'api.example.test',
        version: '/v1',
        basePath: '/tao',
        log,
      })('/context'),
    ).toBe('https://api.example.test/v1/tao/context');
    expect(log).toHaveBeenCalled();
    expect(buildApiUrl({ version: '/v1', basePath: '/tao' })('/context')).toBe(
      '/v1/tao/context',
    );
  });
});

describe('@tao.js/http-client fetch primitives', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockFetchClient.mockReset();
  });

  it('parses JSON, text, binary, empty, and failing fetch responses', async () => {
    global.fetch.mockResolvedValueOnce(response({ json: { id: 1 } }));
    await expect(request('/json', {})).resolves.toEqual({ id: 1 });

    global.fetch.mockResolvedValueOnce(
      response({
        contentType: 'text/plain',
        text: 'hello',
      }),
    );
    await expect(request('/text', {})).resolves.toBe('hello');

    const binary = { binary: true };
    global.fetch.mockResolvedValueOnce(
      response({
        contentType: 'image/png',
        blob: binary,
      }),
    );
    await expect(request('/binary', {})).resolves.toBe(binary);

    global.fetch.mockResolvedValueOnce(
      response({ contentLength: 0, statusText: 'No Content' }),
    );
    await expect(request('/empty', {})).resolves.toEqual({
      success: true,
      message: 'No Content',
    });

    global.fetch.mockResolvedValueOnce(response({ json: null }));
    await expect(request('/missing', {})).rejects.toMatchObject({
      status: 513,
      statusText: 'Missing Body',
    });

    global.fetch.mockResolvedValueOnce(
      response({
        status: 404,
        statusText: 'Not Found',
        json: { message: 'missing' },
      }),
    );
    await expect(request('/missing', {})).rejects.toMatchObject({
      message: 'missing',
      status: 404,
    });

    global.fetch.mockResolvedValueOnce(
      response({
        status: 500,
        statusText: 'Broken',
        json: 'server down',
      }),
    );
    await expect(request('/fallback', {})).rejects.toMatchObject({
      message: 'server down',
      status: 500,
    });

    global.fetch.mockResolvedValueOnce(
      response({
        status: 502,
        statusText: 'Bad Gateway',
        contentLength: 0,
      }),
    );
    await expect(request('/fallback-message', {})).rejects.toMatchObject({
      message: 'Response error: /fallback-message resulted in 502',
      status: 502,
    });
  });
});

describe('@tao.js/http-client TAO adapter', () => {
  beforeEach(() => {
    mockFetchClient.mockReset();
  });

  it('converts successful responses to AppCtx values and lists responses', async () => {
    const client = new TaoHttpClient({
      protocol: 'http',
      host: 'localhost:3000',
      basePath: 'api',
      headers: { Authorization: 'token' },
      errorAs: { o: 'Error' },
    });
    mockFetchClient.mockResolvedValueOnce({
      tao: { t: 'User', a: 'View', o: 'Web' },
      data: { id: 1 },
    });
    const ac = await client.handler(
      { t: 'User', a: 'Find', o: 'Web' },
      { id: 1 },
    );
    expect(ac.unwrapCtx()).toEqual({ t: 'User', a: 'View', o: 'Web' });
    expect(mockFetchClient).toHaveBeenCalledWith(
      'http://localhost:3000/api/context',
      expect.objectContaining({ method: 'POST' }),
    );

    mockFetchClient.mockResolvedValueOnce({ responses: [{ t: 'User' }] });
    await expect(client.fetchResponses()).resolves.toEqual([{ t: 'User' }]);
    mockFetchClient.mockResolvedValueOnce(null);
    await expect(client.fetchResponses()).resolves.toEqual([]);
  });

  it('returns raw values and maps handler failures to configured error trigrams', async () => {
    const client = new TaoHttpClient({ errorAs: { t: 'Failure' } });
    mockFetchClient.mockResolvedValueOnce({ accepted: true });
    await expect(
      client.handler({ t: 'User', a: 'Find', o: 'Web' }, {}),
    ).resolves.toEqual({
      accepted: true,
    });
    mockFetchClient.mockRejectedValueOnce(new Error('offline'));
    const failure = await client.makeHandler({ a: 'Failed' }, 'action')(
      { t: 'User', a: 'Find', o: 'Web' },
      {},
    );
    expect(failure.unwrapCtx()).toEqual({ t: 'User', a: 'Failed', o: 'Web' });
    expect(failure.data.Failed).toMatchObject({ message: 'offline' });
  });

  it('selects all error-data keys and retains falsey response lists', async () => {
    const client = new TaoHttpClient({ errorAs: { action: 'Failed' } });
    mockFetchClient.mockRejectedValueOnce(new Error('offline'));
    const failure = await client.handler(
      { t: 'User', a: 'Find', o: 'Web' },
      {},
    );
    expect(failure.data.Find).toBeInstanceOf(Error);
    mockFetchClient.mockResolvedValueOnce({});
    await expect(client.fetchResponses()).resolves.toEqual([]);
  });
});
