/**
 * Runtime translation fidelity (TYPED-SPEC.md §4): typed signals are
 * ordinary signals on the kernel — phases, chaining, wildcards, and traces
 * behave identically to their untyped equivalents.
 */
import { Kernel, AppCtx } from '@tao.js/core';
import { Tracer, InMemorySink } from '@tao.js/telemetry';
import { signal, defineVocabulary, typedKernel, isTypedSignal, keyOf } from '../src';

const makeVocab = () =>
  defineVocabulary({
    UserFind: signal('User', 'Find', 'Portal').data<{ User: { id: string } }>(),
    UserView: signal('User', 'View', 'Portal').data<{ User: { id: string; name: string } }>(),
    UserFail: signal('User', 'Fail', 'Portal').data<{ User: { reason: string } }>(),
    SpaceEnter: signal('Space', 'Enter', 'Portal').data<{ Space: { id: string } }>(),
  });

const drain = () => new Promise((resolve) => setTimeout(resolve, 30));

describe('signal + defineVocabulary', () => {
  it('constructs typed signals fusing trigram and datagram', () => {
    const App = makeVocab();
    const s = App.UserFind({ User: { id: '42' } });
    expect(s).toEqual({ t: 'User', a: 'Find', o: 'Portal', data: { User: { id: '42' } } });
    expect(Object.isFrozen(s)).toBe(true);
    expect(App.UserFind.t).toBe('User');
    expect(App.UserFind.a).toBe('Find');
    expect(App.UserFind.o).toBe('Portal');
  });

  it('exposes the declared protocol as data', () => {
    const App = makeVocab();
    expect(App.toProtocol()).toEqual([
      { name: 'UserFind', t: 'User', a: 'Find', o: 'Portal' },
      { name: 'UserView', t: 'User', a: 'View', o: 'Portal' },
      { name: 'UserFail', t: 'User', a: 'Fail', o: 'Portal' },
      { name: 'SpaceEnter', t: 'Space', a: 'Enter', o: 'Portal' },
    ]);
    expect(App.has({ t: 'User', a: 'Find', o: 'Portal' })).toBe(true);
    expect(App.has({ t: 'User', a: 'Delete', o: 'Portal' })).toBe(false);
  });

  it('rejects duplicate trigrams and reserved names', () => {
    expect(() =>
      defineVocabulary({
        A: signal('X', 'Y', 'Z').data<object>(),
        B: signal('X', 'Y', 'Z').data<object>(),
      }),
    ).toThrow(/duplicate trigram \{X, Y, Z\}/);
    expect(() =>
      defineVocabulary({ match: signal('X', 'Y', 'Z').data<object>() }),
    ).toThrow(/'match' is reserved/);
  });

  it('keyOf matches the core key format', () => {
    expect(keyOf({ t: 'User', a: 'Find', o: 'Portal' })).toBe('User|Find|Portal');
    expect(new AppCtx('User', 'Find', 'Portal').key).toBe('User|Find|Portal');
  });

  it('isTypedSignal discriminates signals from junk', () => {
    const App = makeVocab();
    expect(isTypedSignal(App.UserFind({ User: { id: '1' } }))).toBe(true);
    expect(isTypedSignal(undefined)).toBe(false);
    expect(isTypedSignal(true)).toBe(false);
    expect(isTypedSignal({ t: 'x', a: 'y' })).toBe(false);
  });
});

describe('typedKernel translation', () => {
  it('guards its inputs', () => {
    const App = makeVocab();
    expect(() => typedKernel({} as never, App)).toThrow(
      /requires a @tao\.js\/core Kernel/,
    );
    expect(() => typedKernel(new Kernel(), {} as never)).toThrow(
      /requires a vocabulary/,
    );
  });

  it('set() dispatches to untyped handlers and typed handlers receive the fused signal', async () => {
    const App = makeVocab();
    const kernel = new Kernel();
    const tao = typedKernel(kernel, App);
    const typedSeen: unknown[] = [];
    const untypedSeen: unknown[] = [];
    tao.onInline(App.UserFind, (s) => {
      typedSeen.push(s);
    });
    kernel.addInlineHandler({ t: 'User', a: 'Find', o: 'Portal' }, (t: { t: string }, data: unknown) => {
      untypedSeen.push(data);
    });
    tao.set(App.UserFind({ User: { id: '7' } }));
    await drain();
    expect(typedSeen).toEqual([
      { t: 'User', a: 'Find', o: 'Portal', data: { User: { id: '7' } } },
    ]);
    expect(untypedSeen).toEqual([{ User: { id: '7' } }]);
  });

  it('typed chaining: returned signals chain exactly like returned AppCtx', async () => {
    const App = makeVocab();
    const kernel = new Kernel();
    const tao = typedKernel(kernel, App);
    const order: string[] = [];
    tao.onInline(App.UserFind, (s) => {
      order.push(`find:${s.data.User.id}`);
      return App.UserView({ User: { id: s.data.User.id, name: 'N' } });
    });
    tao.onInline(App.UserView, (s) => {
      order.push(`view:${s.data.User.name}`);
    });
    tao.set(App.UserFind({ User: { id: '9' } }));
    await drain();
    expect(order).toEqual(['find:9', 'view:N']);
  });

  it('async typed handlers resolve to chains', async () => {
    const App = makeVocab();
    const kernel = new Kernel();
    const tao = typedKernel(kernel, App);
    const seen: string[] = [];
    tao.onAsync(App.UserFind, async (s) => {
      return App.UserView({ User: { id: s.data.User.id, name: 'async' } });
    });
    tao.onInline(App.UserView, (s) => {
      seen.push(s.data.User.name);
    });
    tao.set(App.UserFind({ User: { id: '3' } }));
    await drain();
    expect(seen).toEqual(['async']);
  });

  it('intercept verdicts pass through: truthy halts, signal diverts', async () => {
    const App = makeVocab();
    const kernel = new Kernel();
    const tao = typedKernel(kernel, App);
    const reached: string[] = [];
    tao.onIntercept(App.UserFind, (s) =>
      s.data.User.id === 'blocked'
        ? true
        : s.data.User.id === 'divert'
          ? App.UserFail({ User: { reason: 'diverted' } })
          : undefined,
    );
    tao.onInline(App.UserFind, () => {
      reached.push('inline');
    });
    tao.onInline(App.UserFail, (s) => {
      reached.push(`fail:${s.data.User.reason}`);
    });
    tao.set(App.UserFind({ User: { id: 'blocked' } }));
    await drain();
    expect(reached).toEqual([]);
    tao.set(App.UserFind({ User: { id: 'divert' } }));
    await drain();
    expect(reached).toEqual(['fail:diverted']);
    tao.set(App.UserFind({ User: { id: 'ok' } }));
    await drain();
    expect(reached).toEqual(['fail:diverted', 'inline']);
  });

  it('matchers receive the projected union and skip out-of-vocabulary signals', async () => {
    const App = makeVocab();
    const kernel = new Kernel();
    const tao = typedKernel(kernel, App);
    const seen: string[] = [];
    tao.onInline(App.match({ t: 'User' }), (s) => {
      seen.push(`${s.a}`);
    });
    tao.set(App.UserFind({ User: { id: '1' } }));
    tao.set(App.SpaceEnter({ Space: { id: 's' } }));
    kernel.setCtx({ t: 'User', a: 'Undeclared', o: 'Portal' }, { x: 1 });
    await drain();
    expect(seen).toEqual(['Find']);
  });

  it('any() sees every vocabulary signal but nothing undeclared', async () => {
    const App = makeVocab();
    const kernel = new Kernel();
    const tao = typedKernel(kernel, App);
    const seen: string[] = [];
    tao.onInline(App.any(), (s) => {
      seen.push(s.t);
    });
    tao.set(App.UserFind({ User: { id: '1' } }));
    tao.set(App.SpaceEnter({ Space: { id: 's' } }));
    kernel.setCtx({ t: 'Rogue', a: 'Run', o: 'App' }, {});
    await drain();
    expect(seen.sort()).toEqual(['Space', 'User']);
  });

  it('dispose unregisters exactly the adapted handler', async () => {
    const App = makeVocab();
    const kernel = new Kernel();
    const tao = typedKernel(kernel, App);
    const seen: string[] = [];
    const dispose = tao.onInline(App.UserFind, () => {
      seen.push('a');
    });
    tao.onInline(App.UserFind, () => {
      seen.push('b');
    });
    dispose();
    tao.set(App.UserFind({ User: { id: '1' } }));
    await drain();
    expect(seen).toEqual(['b']);
  });

  it('a typed cascade traces identically to its untyped equivalent', async () => {
    const App = makeVocab();
    const typedK = new Kernel();
    const untypedK = new Kernel();
    const typedSink = new InMemorySink();
    const untypedSink = new InMemorySink();
    new Tracer(typedK, { sinks: [typedSink] });
    new Tracer(untypedK, { sinks: [untypedSink] });

    const tao = typedKernel(typedK, App);
    tao.onInline(App.UserFind, (s) =>
      App.UserView({ User: { id: s.data.User.id, name: 'T' } }),
    );
    tao.set(App.UserFind({ User: { id: '5' } }));

    untypedK.addInlineHandler(
      { t: 'User', a: 'Find', o: 'Portal' },
      (t: { t: string }, data: { User: { id: string } }) =>
        new AppCtx('User', 'View', 'Portal', { User: { id: data.User.id, name: 'T' } }),
    );
    untypedK.setCtx({ t: 'User', a: 'Find', o: 'Portal' }, { User: { id: '5' } });
    await drain();

    const shape = (records: Array<{ key: string; via?: string; parentId: string | null }>) =>
      records.map((r) => ({ key: r.key, via: r.via ?? null, isRoot: r.parentId === null }));
    expect(shape(typedSink.records)).toEqual(shape(untypedSink.records));
    expect(typedSink.format()).toBe(untypedSink.format());
  });
});
