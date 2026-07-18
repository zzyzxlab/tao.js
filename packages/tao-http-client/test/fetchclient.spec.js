const mockRequest = jest.fn();

jest.mock('../src/request', () => ({
  __esModule: true,
  default: (...args) => mockRequest(...args),
}));
jest.mock('src/helpers/debug', () => () => jest.fn(), { virtual: true });

import fetchClient from '../src/fetchclient';

describe('@tao.js/http-client fetch client', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('serializes bodies and merges standard and custom headers', async () => {
    mockRequest.mockResolvedValue({ ok: true });

    await expect(
      fetchClient('/endpoint', {
        method: 'POST',
        body: { id: 1 },
        headers: {
          'Content-Type': 'application/vnd.tao+json',
          Authorization: 'Bearer token',
        },
      }),
    ).resolves.toEqual({ ok: true });

    const [, options] = mockRequest.mock.calls[0];
    expect(options.body).toBe('{"id":1}');
    expect(options.headers.get('content-type')).toBe(
      'application/vnd.tao+json',
    );
    expect(options.headers.get('authorization')).toBe('Bearer token');
  });

  it('adds request metadata to failures', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));

    await expect(fetchClient('/endpoint')).rejects.toMatchObject({
      message: 'offline',
      meta: { fullUrl: '/endpoint' },
    });
  });
});
