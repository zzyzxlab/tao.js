const mockApiRequester = jest.fn();

jest.mock(
  'invariant',
  () => (value, message) => {
    if (!value) throw new Error(message);
  },
  { virtual: true },
);
jest.mock(
  'data.validation',
  () => ({
    __esModule: true,
    default: {
      Success: (value) => ({ ok: true, value }),
      Failure: (error) => ({ ok: false, error }),
    },
  }),
  { virtual: true },
);
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
jest.mock('src/helpers/debug', () => () => jest.fn(), { virtual: true });
jest.mock(
  'modules/api/apiRequester',
  () => ({
    __esModule: true,
    default: (...args) => mockApiRequester(...args),
  }),
  { virtual: true },
);
jest.mock(
  '../src/ServiceError',
  () => ({
    __esModule: true,
    default: class ServiceError extends Error {
      constructor(type, meta, message) {
        super(message);
        this.type = type;
        this.meta = meta;
      }
    },
  }),
  { virtual: true },
);
jest.mock(
  '../src/types',
  () => ({
    INVALID_PARAMETERS: 'invalid',
    NOT_AUTHENTICATED: 'unauthenticated',
    UNAUTHORIZED: 'unauthorized',
    NOT_FOUND: 'not-found',
    ILLEGAL_CALL: 'illegal',
    TIMEOUT: 'timeout',
    SERVICE_ERROR: 'service-error',
  }),
  { virtual: true },
);

import Requester from '../src/Requester';

describe('@tao.js/http-client Requester', () => {
  beforeEach(() => {
    mockApiRequester.mockReset();
  });

  it('requires a definition and builds GET calls with query parameters', async () => {
    expect(() => Requester()).toThrow(
      'cannot create a Requester without a definition',
    );
    mockApiRequester.mockResolvedValue({ id: '42' });
    const call = Requester({
      host: 'api.example.test',
      version: 'v1',
      basePath: 'users',
      options: { headers: { Accept: 'application/json' } },
    })({
      endpoint: '/users/:id',
      method: 'GET',
    });
    await expect(
      call({
        params: { id: '42', include: 'roles' },
        authToken: 'token',
      }),
    ).resolves.toEqual({ ok: true, value: { id: '42' } });
    expect(mockApiRequester).toHaveBeenCalledWith(
      'https://api.example.test/v1/users/users/42?include=roles',
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        headers: expect.objectContaining({ Authorization: 'token' }),
      }),
    );
  });

  it('builds request bodies and maps HTTP errors to service failures', async () => {
    mockApiRequester.mockRejectedValue({
      status: 404,
      meta: { fullUrl: '/missing' },
      message: 'missing',
    });
    const call = Requester({})({
      endpoint: '/users/:id',
      method: 'POST',
      dupParams: ['id'],
      options: { headers: { 'X-Call': 'yes' } },
    });
    const result = await call({
      params: { id: '42', name: 'Ada' },
      authToken: 'token',
      headers: { 'X-Request': 'yes' },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({
      type: 'not-found',
      message: 'missing',
      meta: { fullUrl: '/missing' },
    });
    expect(mockApiRequester).toHaveBeenCalledWith(
      '/users/42',
      expect.objectContaining({
        method: 'POST',
        body: { id: '42', name: 'Ada' },
      }),
    );

    mockApiRequester.mockRejectedValueOnce({ message: 'offline' });
    const fallback = await call({
      params: { id: '42', name: 'Ada' },
      authToken: 'token',
    });
    expect(fallback).toMatchObject({
      ok: false,
      error: { type: 'service-error', message: 'offline' },
    });
  });
});
