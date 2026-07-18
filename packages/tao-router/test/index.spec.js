import init, { route } from '../src';
import Router from '../src/Router';
import makeRouteHandler, {
  convertPath,
  deconstructPath,
} from '../src/routeHandler';

function makeTao() {
  const handlers = [];
  return {
    handlers,
    addInlineHandler: jest.fn((match, handler) =>
      handlers.push({ match, handler }),
    ),
    addAsyncHandler: jest.fn(),
    removeAsyncHandler: jest.fn(),
    setCtx: jest.fn(),
    setAppCtx: jest.fn(),
  };
}

function handlerFor(tao, t, a) {
  return tao.handlers.find(({ match }) => match.t === t && match.a === a)
    .handler;
}

describe('@tao.js/router', () => {
  it('exports an initializer and builds tagged routes', () => {
    expect(init).toBeInstanceOf(Function);
    expect(route`/users/${'user.id'}`({ user: { id: 7 } })).toBe('/users/7');
    expect(route`/${'missing'}`({})).toBe('/');
  });

  it('deconstructs, converts, and handles route paths', () => {
    const parts = deconstructPath('/users/{User.id}/view/{o}');
    expect(parts.map((part) => part.use)).toEqual([
      '',
      'users',
      ':User__0__id',
      'view',
      ':o',
    ]);
    expect(convertPath(parts)).toBe('/users/:User__0__id/view/:o');

    const history = { location: { pathname: '/' }, push: jest.fn() };
    const handler = makeRouteHandler(history, {
      path: '/users/{User.id}/{t}',
      lowerCase: true,
    });
    const result = handler(
      { t: 'User', a: 'View', o: 'Portal' },
      { User: { id: 'ABC' } },
    );

    expect(history.push).toHaveBeenCalledWith('/users/abc/user');
    expect(result.unwrapCtx()).toEqual({ t: 'Route', a: 'Set', o: 'Portal' });
    expect(result.data.Set).toBe('/users/abc/user');
    history.location.pathname = '/users/abc/user';
    expect(
      handler({ t: 'User', a: 'View', o: 'Portal' }, { User: { id: 'ABC' } }),
    ).toBeUndefined();
  });

  it('configures, attaches, removes, and reacts to routes', () => {
    const tao = makeTao();
    const history = {
      location: { pathname: '/users/42' },
      listen: jest.fn(() => jest.fn()),
      push: jest.fn(),
    };
    const router = new Router(tao, history, {
      initAc: { t: 'App', a: 'Init', o: 'Web' },
      incomingAc: { t: 'App', a: 'Incoming', o: 'Web' },
      defaultRoute: '/users/42',
      orient: 'Web',
    });

    const initHandler = tao.handlers[0].handler;
    expect(initHandler({ o: 'Web' }).unwrapCtx()).toEqual({
      t: 'Router',
      a: 'Init',
      o: 'Web',
    });

    const configure = handlerFor(tao, 'Routes', 'Configure');
    const route = { path: '/users/{User.id}', lowerCase: true };
    const add = { tao: { t: 'User', a: 'View', o: 'Web' }, attach: true };
    configure(
      { o: 'Web' },
      {
        Routes: {
          Route: route,
          Add: add,
          Attach: { tao: add.tao, data: { User: { role: 'member' } } },
        },
      },
    );
    expect(tao.setCtx).toHaveBeenCalledWith(
      { t: 'Route', a: 'Add', o: 'Web' },
      [route, add],
    );

    const addHandler = handlerFor(tao, 'Route', 'Add');
    const attached = addHandler({ o: 'Web' }, { Route: route, Add: add });
    expect(tao.addAsyncHandler).toHaveBeenCalled();
    expect(attached.unwrapCtx()).toEqual({ t: 'Route', a: 'Attach', o: 'Web' });
    addHandler({ o: 'Web' }, { Route: route, Add: add });
    expect(tao.removeAsyncHandler).toHaveBeenCalled();

    const attach = handlerFor(tao, 'Route', 'Attach');
    attach(
      { o: 'Web' },
      {
        Route: route,
        Attach: { tao: add.tao, data: { User: { role: 'member' } } },
      },
    );
    const incoming = handlerFor(tao, 'App', 'Incoming');
    incoming({ o: 'Web' }, {});
    expect(tao.setAppCtx).toHaveBeenCalledWith(
      expect.objectContaining({
        t: 'User',
        a: 'View',
        o: 'Web',
        data: { User: { id: '42', role: 'member' } },
      }),
    );

    const detach = handlerFor(tao, 'Route', 'Detach');
    detach({ o: 'Web' }, { Route: route, Detach: { tao: add.tao } });
    const remove = handlerFor(tao, 'Route', 'Remove');
    expect(
      remove({ o: 'Web' }, { Route: route, Remove: add.tao }),
    ).toBeUndefined();
    addHandler({ o: 'Web' }, { Route: route, Add: add });
    expect(
      remove(
        { o: 'Web' },
        { Route: route, Remove: { ...add.tao, detach: true } },
      ).unwrapCtx(),
    ).toEqual({
      t: 'Route',
      a: 'Detach',
      o: 'Web',
    });

    expect(router.getPathFrom({ t: 'Space', a: 'View' })).toBe('/space');
    expect(router.getPathFrom({ t: 'User', a: 'View' })).toBe('');
    expect(router.getPathFrom({ a: 'Find' })).toBeUndefined();
    expect(router.getAcsFrom()).toEqual([]);
    router.historyChange({ pathname: '/unknown' }, 'POP');
    router.historyChange({ pathname: '/users/42' }, 'PUSH');
  });

  it('handles optional configuration and route edge cases', () => {
    const tao = makeTao();
    const history = {
      location: { pathname: '/missing' },
      listen: jest.fn(() => jest.fn()),
      push: jest.fn(),
    };
    const router = new Router(tao, history, {
      initAc: { t: 'App', a: 'Init', o: 'Web' },
      incomingAc: [{ t: 'App', a: 'Incoming', o: 'Web' }],
      defaultRoute: '/things/9',
      debug: true,
    });
    const route = { path: '/things/{Thing.id}' };
    const add = { t: 'Thing', a: 'View', o: 'Web' };
    handlerFor(
      tao,
      'Route',
      'Attach',
    )({ o: 'Web' }, { Route: route, Attach: add });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const configure = handlerFor(tao, 'Routes', 'Configure');
    configure(
      { o: 'Web' },
      { Routes: [{ Route: route, Remove: add, Detach: add }] },
    );
    const incoming = handlerFor(tao, 'App', 'Incoming');
    incoming({ o: 'Web' }, {});
    expect(tao.setAppCtx).toHaveBeenCalledWith(
      expect.objectContaining({
        t: 'Thing',
        a: 'View',
        o: 'Web',
        data: { Thing: { id: '9' } },
      }),
    );
    router.historyChange({ pathname: '/things/9' }, 'POP');
    expect(tao.setAppCtx).toHaveBeenCalledTimes(2);
    expect(
      handlerFor(
        tao,
        'Route',
        'Remove',
      )({ o: 'Web' }, { Route: route, Remove: add }),
    ).toBeUndefined();
    log.mockRestore();
  });
});
