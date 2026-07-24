/**
 * Behavioral test: the HTTP middleware against a real @tao.js/core Kernel and
 * a real @tao.js/telemetry Tracer — the executable form of ENVELOPE-SPEC.md
 * §9's request/response transport contract: an inbound `traceparent` header
 * becomes entry chain state, so the entry's trace record (and everything it
 * chains) continues the remote trace.
 */
import { Kernel, AppCtx } from '@tao.js/core';
import Tracer, { InMemorySink } from '@tao.js/telemetry';
import taoMiddleware from '../src';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const PARENT_ID = 'b7ad6b7169203331';

async function drain(rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('@tao.js/koa HTTP middleware behavior (real core + utils)', () => {
  it('resolves the POST with the chained response (transponder stays attached until handleContext settles)', async () => {
    const TAO = new Kernel();
    TAO.addInlineHandler(
      { t: 'User', a: 'View', o: 'Web' },
      (tao, data) =>
        new AppCtx('User', 'Viewed', 'Web', { User: { id: data.User.id } }),
    );
    const middleware = taoMiddleware(TAO, { timeout: 500 }).middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: {},
        body: { tao: { t: 'User', a: 'View', o: 'Web' }, data: { id: 7 } },
      },
    };
    await middleware(ctx, jest.fn());
    expect(ctx.status).not.toBe(500);
    expect(ctx.body).toEqual({
      tao: { t: 'User', a: 'Viewed', o: 'Web' },
      data: { User: { id: 7 } },
    });
  });

  it('continues the traceparent header trace on the /tao/context entry', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TAO = new Kernel();
    const sink = new InMemorySink();
    const tracer = new Tracer(TAO, { sinks: [sink] });
    TAO.addInlineHandler(
      { t: 'User', a: 'View', o: 'Web' },
      (tao, data) =>
        new AppCtx('User', 'Viewed', 'Web', { User: { id: data.User.id } }),
    );

    // short transponder timeout so its (never-signalled — see note below)
    // promise settles inside the test
    const middleware = taoMiddleware(TAO, { timeout: 25 }).middleware();
    const ctx = {
      path: '/tao/context',
      method: 'POST',
      request: {
        headers: { traceparent: `00-${TRACE_ID}-${PARENT_ID}-01` },
        body: { tao: { t: 'User', a: 'View', o: 'Web' }, data: { id: 7 } },
      },
    };
    await middleware(ctx, jest.fn());
    await drain();

    // the entry trace record continues the header's trace: same traceId,
    // parented on the header's span
    const entry = sink.records.find((r) => r.key === 'User|View|Web');
    expect(entry).toBeDefined();
    expect(entry.traceId).toBe(TRACE_ID);
    expect(entry.parentId).toBe(PARENT_ID);

    // and the handler-chained response stays causally linked to the entry
    const reply = sink.records.find((r) => r.key === 'User|Viewed|Web');
    expect(reply).toBeDefined();
    expect(reply.traceId).toBe(TRACE_ID);
    expect(reply.parentId).toBe(entry.signalId);
    expect(reply.via).toBe('Inline');

    // Note (suspected source bug, not asserted here): the middleware calls
    // `transponder.detach()` synchronously while the un-awaited async
    // `handleContext` is still parsing the body, so the transponder's
    // resolver decoration is gone before the entry ever dispatches and the
    // response promise can only settle by timeout (ctx ends up 500). Waiting
    // that timeout out keeps the rejection inside this test.
    await new Promise((resolve) => setTimeout(resolve, 60));

    tracer.dispose();
    errorSpy.mockRestore();
  });
});
