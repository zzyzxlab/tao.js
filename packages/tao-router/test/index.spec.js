import { AppCtx } from '@tao.js/core';

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
    expect(route`/a/${'x'}/b/${'y'}/c`({ x: '1', y: '2' })).toBe('/a/1/b/2/c');
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

    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const history = { location: { pathname: '/' }, push: jest.fn() };
    const handler = makeRouteHandler(history, {
      path: '/users/{User.id}/{t}',
      lowerCase: true,
    });
    expect(log).not.toHaveBeenCalled();
    const result = handler(
      { t: 'User', a: 'View', o: 'Portal' },
      { User: { id: 'ABC' } },
    );
    expect(log).not.toHaveBeenCalled();

    expect(history.push).toHaveBeenCalledWith('/users/abc/user');
    expect(result.unwrapCtx()).toEqual({ t: 'Route', a: 'Set', o: 'Portal' });
    expect(result.data.Set).toBe('/users/abc/user');
    history.location.pathname = '/users/abc/user';
    expect(
      handler({ t: 'User', a: 'View', o: 'Portal' }, { User: { id: 'ABC' } }),
    ).toBeUndefined();

    // default `debug = false` must stay silent, and explicit debug=true must log
    // the exact call/pathData payloads.
    const debugHistory = { location: { pathname: '/' }, push: jest.fn() };
    const debugHandler = makeRouteHandler(
      debugHistory,
      { path: '/users/{User.id}' },
      true,
    );
    debugHandler({ t: 'User', a: 'View', o: 'Portal' }, { User: { id: '9' } });
    expect(log).toHaveBeenCalledWith('routeHandler::called with', {
      tao: { t: 'User', a: 'View', o: 'Portal' },
      data: { User: { id: '9' } },
    });
    expect(log).toHaveBeenCalledWith('routeHandler::pathData', {
      User__0__id: '9',
    });
    log.mockRestore();

    // without `lowerCase`, the produced path must keep its original casing.
    const plainHistory = { location: { pathname: '/other' }, push: jest.fn() };
    const plainHandler = makeRouteHandler(plainHistory, '/plain/{Thing.id}');
    plainHandler(
      { t: 'Thing', a: 'View', o: 'Portal' },
      { Thing: { id: 'XYZ' } },
    );
    expect(plainHistory.push).toHaveBeenCalledWith('/plain/XYZ');
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

    const route = { path: '/users/{User.id}', lowerCase: true };
    const add = { tao: { t: 'User', a: 'View', o: 'Web' }, attach: true };
    const otherTrigram = { t: 'Admin', a: 'View', o: 'Web' };

    // removing a trigram that was never added must be a no-op.
    const remove = handlerFor(tao, 'Route', 'Remove');
    expect(
      remove({ o: 'Web' }, { Route: route, Remove: add.tao }),
    ).toBeUndefined();
    expect(tao.removeAsyncHandler).not.toHaveBeenCalled();

    const configure = handlerFor(tao, 'Routes', 'Configure');
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
    expect(tao.setCtx).toHaveBeenCalledWith(
      { t: 'Route', a: 'Attach', o: 'Web' },
      [route, { tao: add.tao, data: { User: { role: 'member' } } }],
    );
    // Remove/Detach were absent from this Routes config; they must not fire.
    expect(tao.setCtx).not.toHaveBeenCalledWith(
      { t: 'Route', a: 'Remove', o: 'Web' },
      expect.anything(),
    );
    expect(tao.setCtx).not.toHaveBeenCalledWith(
      { t: 'Route', a: 'Detach', o: 'Web' },
      expect.anything(),
    );

    const addHandler = handlerFor(tao, 'Route', 'Add');
    const attached = addHandler({ o: 'Web' }, { Route: route, Add: add });
    // first registration: no prior handler to remove yet.
    expect(tao.removeAsyncHandler).not.toHaveBeenCalled();
    expect(tao.addAsyncHandler).toHaveBeenCalled();
    expect(attached.unwrapCtx()).toEqual({ t: 'Route', a: 'Attach', o: 'Web' });
    addHandler({ o: 'Web' }, { Route: route, Add: add });
    expect(tao.removeAsyncHandler).toHaveBeenCalled();
    // Add without `.attach` must not chain into a Route/Attach AppCtx.
    expect(
      addHandler({ o: 'Web' }, { Route: route, Add: { tao: otherTrigram } }),
    ).toBeUndefined();

    const attach = handlerFor(tao, 'Route', 'Attach');
    attach(
      { o: 'Web' },
      {
        Route: route,
        Attach: { tao: add.tao, data: { User: { role: 'member' } } },
      },
    );
    // a second trigram attached to the same route must react independently
    // and must survive detaching the first one.
    attach({ o: 'Web' }, { Route: route, Attach: otherTrigram });

    // exercise mergeData's array/primitive leaf guard: a later trigram's
    // default data for an *already-set* key must be left alone whenever
    // that key already holds a non-array-object value (an array, or a
    // primitive) - it must never be recursed into.
    attach(
      { o: 'Web' },
      {
        Route: route,
        Attach: {
          tao: { t: 'Viewer2', a: 'View', o: 'Web' },
          data: { Extra: { tags: ['x', 'y'], flag: 'member' } },
        },
      },
    );
    attach(
      { o: 'Web' },
      {
        Route: route,
        Attach: {
          tao: { t: 'Viewer3', a: 'View', o: 'Web' },
          data: { Extra: { tags: ['z'], flag: 'other' } },
        },
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
    expect(tao.setAppCtx).toHaveBeenCalledWith(
      expect.objectContaining({ t: 'Admin', a: 'View', o: 'Web' }),
    );
    // the array/primitive leaves set by Viewer2 must survive Viewer3's
    // later, already-set-key merge attempt untouched.
    expect(tao.setAppCtx).toHaveBeenCalledWith(
      expect.objectContaining({
        t: 'Viewer3',
        a: 'View',
        o: 'Web',
        data: {
          Viewer3: expect.objectContaining({
            Extra: { tags: ['x', 'y'], flag: 'member' },
          }),
        },
      }),
    );
    expect(tao.setCtx).toHaveBeenCalledWith(
      { t: 'Route', a: 'Match', o: 'Web' },
      [route.path, expect.any(AppCtx)],
    );

    const node = router._router.define(
      convertPath(deconstructPath(route.path)),
    )[0];
    const userKey = new AppCtx('User', 'View', 'Web').key;
    const adminKey = new AppCtx('Admin', 'View', 'Web').key;
    expect(node.attached).toHaveLength(4);
    expect(node.defaultData.has(userKey)).toBe(true);

    const detach = handlerFor(tao, 'Route', 'Detach');
    detach({ o: 'Web' }, { Route: route, Detach: { tao: add.tao } });
    // detaching User must leave the others attached, and drop User's
    // default data only.
    expect(node.attached).toHaveLength(3);
    expect(node.attached.map((t) => t.key)).not.toContain(userKey);
    expect(node.attached.map((t) => t.key)).toContain(adminKey);
    expect(node.defaultData.has(userKey)).toBe(false);

    tao.setAppCtx.mockClear();
    incoming({ o: 'Web' }, {});
    expect(tao.setAppCtx).toHaveBeenCalledTimes(3);
    expect(tao.setAppCtx).toHaveBeenCalledWith(
      expect.objectContaining({ t: 'Admin', a: 'View', o: 'Web' }),
    );

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

  it('only reacts to POP history changes and never lets a found defaultRoute override a real match', () => {
    const tao = makeTao();
    const history = {
      location: { pathname: '/users/42' },
      listen: jest.fn(() => jest.fn()),
      push: jest.fn(),
    };
    const router = new Router(tao, history, {
      initAc: { t: 'App', a: 'Init', o: 'Web' },
      incomingAc: { t: 'App', a: 'Incoming', o: 'Web' },
      defaultRoute: '/things/99',
      orient: 'Web',
    });
    const attach = handlerFor(tao, 'Route', 'Attach');
    attach(
      { o: 'Web' },
      {
        Route: { path: '/users/{User.id}' },
        Attach: { tao: { t: 'User', a: 'View', o: 'Web' } },
      },
    );
    attach(
      { o: 'Web' },
      {
        Route: { path: '/things/{Thing.id}' },
        Attach: { tao: { t: 'Thing', a: 'View', o: 'Web' } },
      },
    );

    const incoming = handlerFor(tao, 'App', 'Incoming');
    // the pathname matches directly, so the (also-matchable) defaultRoute
    // must never be consulted.
    incoming({ o: 'Web' }, {});
    expect(tao.setAppCtx).toHaveBeenCalledTimes(1);
    expect(tao.setAppCtx).toHaveBeenCalledWith(
      expect.objectContaining({ t: 'User', a: 'View', o: 'Web' }),
    );

    // PUSH must never trigger a route reaction, only POP does.
    router.historyChange({ pathname: '/users/42' }, 'PUSH');
    expect(tao.setAppCtx).toHaveBeenCalledTimes(1);
    router.historyChange({ pathname: '/users/42' }, 'POP');
    expect(tao.setAppCtx).toHaveBeenCalledTimes(2);

    // neither the pathname nor the defaultRoute match anything: no crash,
    // no reaction.
    const freshTao = makeTao();
    const freshHistory = {
      location: { pathname: '/nowhere' },
      listen: jest.fn(() => jest.fn()),
      push: jest.fn(),
    };
    new Router(freshTao, freshHistory, {
      initAc: { t: 'App', a: 'Init', o: 'Web' },
      incomingAc: { t: 'App', a: 'Incoming', o: 'Web' },
      defaultRoute: '/also-nowhere',
      orient: 'Web',
    });
    const freshIncoming = handlerFor(freshTao, 'App', 'Incoming');
    expect(() => freshIncoming({ o: 'Web' }, {})).not.toThrow();
    expect(freshTao.setAppCtx).not.toHaveBeenCalled();
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
    // Add/Attach were absent from this Routes config; they must not fire.
    expect(tao.setCtx).not.toHaveBeenCalledWith(
      { t: 'Route', a: 'Add', o: 'Web' },
      expect.anything(),
    );
    expect(tao.setCtx).not.toHaveBeenCalledWith(
      { t: 'Route', a: 'Attach', o: 'Web' },
      expect.anything(),
    );
    // Remove/Detach were present; they must fire with the exact args.
    expect(tao.setCtx).toHaveBeenCalledWith(
      { t: 'Route', a: 'Remove', o: 'Web' },
      [route, add],
    );
    expect(tao.setCtx).toHaveBeenCalledWith(
      { t: 'Route', a: 'Detach', o: 'Web' },
      [route, add],
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
    // Remove for a trigram with no registered handler must not touch TAO.
    expect(tao.removeAsyncHandler).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('handles constructor, capitalization, and ignored route edges', () => {
    const noIncomingTao = makeTao();
    const optionsOnly = new Router(noIncomingTao, {
      initAc: { t: 'App', a: 'Init', o: 'Web' },
    });
    expect(optionsOnly._history).toBeDefined();
    expect(optionsOnly._debug).toBe(false);
    // no incomingAc => no extra "incoming" handler is ever registered, and
    // every wildcard-orient handler must fall back to the empty-string orient.
    expect(noIncomingTao.handlers).toHaveLength(6);
    ['Configure', 'Add', 'Remove', 'Attach', 'Detach'].forEach((action) => {
      const registered = noIncomingTao.handlers.find(
        (h) => h.match.a === action,
      );
      expect(registered.match.o).toBe('');
    });
    expect(new Router(makeTao(), null, null)._history).toBeDefined();

    const tao = makeTao();
    const history = {
      // lowercase on purpose: only real capitalization logic can turn this
      // into the expected `User`/`View`/`Web` trigram below.
      location: { pathname: '/user/view/web' },
      listen: jest.fn(() => jest.fn()),
      push: jest.fn(),
    };
    const router = new Router(tao, history, {
      initAc: { t: 'App', a: 'Init', o: 'Web' },
      incomingAc: new AppCtx('App', 'Incoming', 'Web'),
    });
    const route = { path: '/{t}/{a}/{o}', lowerCase: true };
    const attach = handlerFor(tao, 'Route', 'Attach');
    attach({ o: 'Web' }, { Route: route, Attach: {} });
    const wildNode = router._router.define('/:t/:a/:o')[0];
    // Attach without `.tao` must never populate defaultData.
    expect(wildNode.defaultData.size).toBe(0);
    delete router._router.define('/:t/:a/:o')[0].defaultData;
    handlerFor(tao, 'App', 'Incoming')({ o: 'Web' }, {});
    expect(tao.setAppCtx).toHaveBeenLastCalledWith(
      expect.objectContaining({ t: 'User', a: 'View', o: 'Web' }),
    );

    // detaching with a wildcard target must only remove *exact* key matches
    // (not every wildcard-compatible entry): a concrete trigram attached
    // alongside the fully-wild one above must survive.
    attach(
      { o: 'Web' },
      { Route: route, Attach: { t: 'Concrete', a: 'Thing', o: 'Web' } },
    );
    const detachWild = handlerFor(tao, 'Route', 'Detach');
    detachWild({ o: 'Web' }, { Route: route, Detach: {} });
    expect(wildNode.attached).toHaveLength(1);
    expect(wildNode.attached[0].t).toBe('Concrete');

    // without `lowerCase`, a fully-wild trigram must keep the URL's casing.
    history.location.pathname = '/w/web';
    attach({ o: 'Web' }, { Route: { path: '/w/{o}' }, Attach: {} });
    handlerFor(tao, 'App', 'Incoming')({ o: 'Web' }, {});
    expect(tao.setAppCtx).toHaveBeenLastCalledWith(
      expect.objectContaining({ o: 'web' }),
    );

    // an empty captured URL segment must not create a spurious data key.
    history.location.pathname = '/users2/';
    attach({ o: 'Web' }, { Route: '/users2/{User.id}', Attach: {} });
    handlerFor(tao, 'App', 'Incoming')({ o: 'Web' }, {});
    expect(tao.setAppCtx).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { undefined: {} } }),
    );

    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const add = handlerFor(tao, 'Route', 'Add');
    router._debug = true;
    add(
      { o: 'Web' },
      {
        Route: '/users',
        Add: {
          t: 'User',
          a: 'View',
          o: 'Web',
          ignore: { t: 'Ignored', a: 'View', o: 'Web' },
        },
      },
    );
    const ignoredHandler = tao.addAsyncHandler.mock.calls.at(-1)[1];
    ignoredHandler({ t: 'User', a: 'View', o: 'Web' }, {});
    ignoredHandler({ t: 'Ignored', a: 'View', o: 'Web' }, {});
    // only the non-ignored call must have pushed.
    expect(history.push).toHaveBeenCalledTimes(1);
    expect(history.push).toHaveBeenCalledWith('/users');
    expect(log).toHaveBeenCalledWith('route.add::trigram.unwrapCtx():', {
      t: 'User',
      a: 'View',
      o: 'Web',
    });
    add(
      { o: 'Web' },
      {
        Route: '/plain',
        Add: {
          t: 'Plain',
          a: 'View',
          o: 'Web',
          ignore: [
            { t: 'Ignored', a: 'View', o: 'Web' },
            { t: 'AlsoIgnored', a: 'View', o: 'Web' },
          ],
        },
      },
    );
    const plainHandler = tao.addAsyncHandler.mock.calls.at(-1)[1];
    history.push.mockClear();
    // matches only ONE of the two ignore entries: with `.some`, that alone
    // must be enough to filter it out.
    plainHandler({ t: 'Ignored', a: 'View', o: 'Web' }, {});
    expect(history.push).not.toHaveBeenCalled();
    plainHandler({ t: 'Plain', a: 'View', o: 'Web' }, {});
    expect(history.push).toHaveBeenCalledWith('/plain');

    const detach = handlerFor(tao, 'Route', 'Detach');
    attach(
      { o: 'Web' },
      {
        Route: '/plain',
        Attach: { tao: { t: 'Plain', a: 'View', o: 'Web' } },
      },
    );
    detach(
      { o: 'Web' },
      { Route: '/plain', Detach: { t: 'Plain', a: 'View', o: 'Web' } },
    );
    detach({ o: 'Web' }, { Route: '/unattached', Detach: {} });
    log.mockRestore();
  });

  it('does not add absent route-path data', () => {
    const history = { location: { pathname: '/' }, push: jest.fn() };
    const handler = makeRouteHandler(history, '/users/{User.id}');
    expect(() =>
      handler({ t: 'User', a: 'View', o: 'Web' }, { User: {} }),
    ).toThrow();
  });
});
