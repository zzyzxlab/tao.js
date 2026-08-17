import { AppCtx, Kernel, Network } from '@tao.js/core';
import freezeDatum from '../src/freezeDatum';

const TRIGRAM = { t: 'User', a: 'Find', o: 'Portal' };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('freezeDatum', () => {
  it('stamps a diagnostic decoration name', () => {
    const network = new Network();
    freezeDatum(network);
    expect([...network._decorators].map((d) => d.name)).toContain(
      'freezeDatum',
    );
  });

  it('rejects a surface that cannot decorate', () => {
    expect(() => freezeDatum()).toThrow(/decorate\(\)/);
    expect(() => freezeDatum(null)).toThrow(/decorate\(\)/);
    expect(() => freezeDatum({})).toThrow(/decorate\(\)/);
    expect(() => freezeDatum({ decorate: 1 })).toThrow(/decorate\(\)/);
    expect(() => freezeDatum({ _network: {} })).toThrow(/decorate\(\)/);
  });

  it('deep-freezes ac.data on a Network before handlers run', async () => {
    const network = new Network();
    const seen = [];
    freezeDatum(network);
    network.addInlineHandler(TRIGRAM, (tao, data) => {
      seen.push(data);
    });
    const datum = {
      User: { skip: null, nested: { ok: true }, id: '42' },
    };
    network.enter(new AppCtx(TRIGRAM.t, TRIGRAM.a, TRIGRAM.o, datum));
    await flush();
    expect(seen).toHaveLength(1);
    expect(Object.isFrozen(seen[0])).toBe(true);
    expect(Object.isFrozen(seen[0].User)).toBe(true);
    expect(Object.isFrozen(seen[0].User.nested)).toBe(true);
    expect(seen[0].User.skip).toBe(null);
    expect(() => {
      seen[0].User.id = 'hacked';
    }).toThrow();
  });

  it('freezes at onReceived, before any onDispatch observer runs', async () => {
    const network = new Network();
    const mutations = [];
    network.decorate({
      onDispatch: (ac) => {
        try {
          ac.data.User.id = 'from-onDispatch';
          mutations.push('mutated');
        } catch {
          mutations.push('frozen');
        }
      },
    });
    freezeDatum(network);
    network.addInlineHandler(TRIGRAM, jest.fn());
    network.enter(
      new AppCtx(TRIGRAM.t, TRIGRAM.a, TRIGRAM.o, { User: { id: '1' } }),
    );
    await flush();
    expect(mutations).toEqual(['frozen']);
  });

  it('resolves a Kernel via _network', async () => {
    const kernel = new Kernel();
    freezeDatum(kernel);
    let frozen = false;
    kernel.addInlineHandler(TRIGRAM, (tao, data) => {
      frozen = Object.isFrozen(data) && Object.isFrozen(data.User);
    });
    kernel.setCtx(TRIGRAM, { User: { id: '1' } });
    await flush();
    expect(frozen).toBe(true);
  });

  it('freezes array values and already-frozen parents still freeze children', async () => {
    const network = new Network();
    freezeDatum(network);
    const child = { n: 1 };
    const tags = [{ x: 1 }];
    const user = Object.freeze({ nested: child, tags });
    const datum = { User: user };
    let seen;
    network.addInlineHandler(TRIGRAM, (tao, data) => {
      seen = data;
    });
    network.enter(new AppCtx(TRIGRAM.t, TRIGRAM.a, TRIGRAM.o, datum));
    await flush();
    expect(Object.isFrozen(seen.User)).toBe(true);
    expect(Object.isFrozen(seen.User.nested)).toBe(true);
    expect(Object.isFrozen(seen.User.tags)).toBe(true);
    expect(Object.isFrozen(seen.User.tags[0])).toBe(true);
  });

  it('does not stack-overflow on cyclic datums', async () => {
    const network = new Network();
    freezeDatum(network);
    const datum = { User: { id: 'cycle' } };
    datum.User.self = datum;
    let frozen = false;
    network.addInlineHandler(TRIGRAM, (tao, data) => {
      frozen = Object.isFrozen(data) && Object.isFrozen(data.User);
    });
    expect(() =>
      network.enter(new AppCtx(TRIGRAM.t, TRIGRAM.a, TRIGRAM.o, datum)),
    ).not.toThrow();
    await flush();
    expect(frozen).toBe(true);
  });

  it('still freezes when NODE_ENV is production — no environment magic', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const network = new Network();
      freezeDatum(network);
      let frozen = false;
      network.addInlineHandler(TRIGRAM, (tao, data) => {
        frozen = Object.isFrozen(data);
      });
      network.enter(
        new AppCtx(TRIGRAM.t, TRIGRAM.a, TRIGRAM.o, { User: { id: 'p' } }),
      );
      await flush();
      expect(frozen).toBe(true);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('stops freezing after dispose', async () => {
    const network = new Network();
    const dispose = freezeDatum(network);
    dispose();
    let frozen = true;
    network.addInlineHandler(TRIGRAM, (tao, data) => {
      frozen = Object.isFrozen(data);
      data.User.id = 'mutated';
    });
    network.enter(
      new AppCtx(TRIGRAM.t, TRIGRAM.a, TRIGRAM.o, { User: { id: '1' } }),
    );
    await flush();
    expect(frozen).toBe(false);
  });
});
