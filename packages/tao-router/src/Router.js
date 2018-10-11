import createHistory from 'history/createBrowserHistory';
import routington from 'routington';
import get from 'get-value';
import set from 'set-value';
import { AppCtx } from '@tao.js/core';

import makeRouteHandler, { deconstructPath, convertPath } from './routeHandler';

const CHANGE_ACTION_SIGNAL = 'POP';

function capitalize(str) {
  return `${str.substring(0, 1).toUpperCase()}${str.substring(1)}`;
}

function wrapAc(ac) {
  return ac instanceof AppCtx
    ? ac
    : new AppCtx(ac.t || ac.term, ac.a || ac.action, ac.o || ac.orient);
}

function reactToRoute(TAO, match) {
  console.log('Router::reacting to route');
  let { t, a, o, ...data } = match.node.deconstruction.reduce(
    (pathData, pathItem) => {
      if (!pathItem.match) {
        return pathData;
      }
      const dataPath = pathItem.match[2];
      const pathParam = pathItem.use.substring(1);
      let paramData = match.param[pathParam];
      if (paramData) {
        set(pathData, dataPath, paramData);
      } else if (typeof get(match.node.defaultData, dataPath) !== 'undefined') {
        set(pathData, dataPath, get(match.node.defaultData, dataPath));
      }
      return pathData;
    },
    {}
  );
  console.log('will set:', { t, a, o }, data);
  if (match.node.lowerCase) {
    t = t ? capitalize(t) : t;
    a = a ? capitalize(a) : a;
    o = o ? capitalize(o) : o;
  }
  match.node.attached.forEach(trigram => {
    const ac = new AppCtx(
      trigram.t || trigram.term || t,
      trigram.a || trigram.action || a,
      trigram.o || trigram.orient || o,
      data
    );
    console.log('AppCtx:', ac);
    TAO.setAppCtx(ac);
  });
}

export default class Router {
  constructor(TAO, history, opts) {
    this._tao = TAO;
    if (!opts) {
      opts = history;
      history = null;
    }
    this._history = history || createHistory();
    this.setupEvents = this.setupEvents.bind(this);
    this.historyChange = this.historyChange.bind(this);
    this.getPathFrom = this.getPathFrom.bind(this);
    this.getAcsFrom = this.getAcsFrom.bind(this);
    this._routes = new Map();
    this._router = routington();
    this.setupEvents(
      TAO,
      this._history,
      opts.initAc,
      opts.incomingAc,
      opts.defaultRoute,
      opts.orient
    );
  }

  setupEvents /*= */(
    TAO,
    history,
    initAc,
    incomingAc,
    defaultRoute,
    orient
  ) /* =>*/ {
    this._unlistenHistory = history.listen(this.historyChange);
    const incoming = !incomingAc
      ? []
      : (Array.isArray(incomingAc) ? incomingAc : [incomingAc]).map(ac =>
          wrapAc(ac)
        );
    TAO.addAsyncHandler(initAc, (tao, data) => {
      return new AppCtx('Router', 'Init', tao.o);
    });
    TAO.addInlineHandler(
      { t: 'Routes', a: 'Configure', o: orient || '' },
      (tao, { Routes, Configure }) => {
        const routes = Array.isArray(Routes) ? Routes : [Routes];
        // routes.forEach((r, i) => {
        //   const config = Configure[i];
        routes.forEach(({ Route, Add, Remove, Attach, Detach }) => {
          if (Add) {
            TAO.setCtx({ t: 'Route', a: 'Add', o: tao.o }, [Route, Add]);
            if (Add.attach) {
              Attach = Add;
            }
          }
          if (Remove) {
            TAO.setCtx({ t: 'Route', a: 'Remove', o: tao.o }, [Route, Remove]);
            if (Remove.detach) {
              Detach = Remove;
            }
          }
          if (Attach) {
            TAO.setCtx({ t: 'Route', a: 'Attach', o: tao.o }, [Route, Attach]);
          }
          if (Detach) {
            TAO.setCtx({ t: 'Route', a: 'Detach', o: tao.o }, [Route, Detach]);
          }
        });
        return incoming[0];
      }
    );
    TAO.addInlineHandler(
      { t: 'Route', a: 'Add', o: orient || '' },
      (tao, { Route, Add }) => {
        // add Route to the Router's configuration
        console.log(`adding to Route:`, Route, Add);
        const routeHandler = makeRouteHandler(history, Route);
        const trigram = wrapAc(Add);
        const oldHandler = this._routes.get(trigram.key);
        if (oldHandler) {
          TAO.removeAsyncHandler(trigram.unwrapCtx(), oldHandler);
        }
        this._routes.set(trigram.key, routeHandler);
        console.log('route.add::trigram.unwrapCtx():', trigram.unwrapCtx());
        TAO.addAsyncHandler(trigram.unwrapCtx(), routeHandler);
      }
    );
    TAO.addInlineHandler(
      { t: 'Route', a: 'Remove', o: orient || '' },
      (tao, { Route, Remove }) => {
        // remove Route from the Router's configuration
        console.log(`removing from Route ${Route}:`, Remove);
        const trigram = wrapAc(Remove);
        const routeHandler = this._routes.get(trigram.key);
        if (!routeHandler) {
          return;
        }
        TAO.removeAsyncHandler(trigram.unwrapCtx(), routeHandler);
        this._routes.delete(trigram.key);
      }
    );
    TAO.addInlineHandler(
      { t: 'Route', a: 'Attach', o: orient || '' },
      (tao, { Route, Attach }) => {
        // attach Trigram to an incoming route
        console.log('Going to Attach Route:', { Route, Attach });
        const deconstruction = deconstructPath(Route.path || Route);
        const convertedPath = convertPath(deconstruction);
        const node = this._router.define(convertedPath)[0];
        node.lowerCase = Route.lowerCase;
        node.deconstruction = deconstruction;
        node.attached = node.attached || [];
        const attachTo = { o: tao.o, ...(Attach.tao || Attach) };
        node.attached.push(attachTo);
        node.defaultData = node.defaultData || new Map();
        if (Attach.tao) {
          const trigram = wrapAc(attachTo);
          node.defaultData.set(trigram.key, Attach.data || {});
        }
      }
    );
    TAO.addInlineHandler(
      { t: 'Route', a: 'Detach', o: orient || '' },
      (tao, { Route, Detach }) => {
        // detach Trigram from an incoming route
        console.log('Going to Detach Route:', { Route, Detach });
      }
    );
    // TAO.addAsyncHandler({}, (tao, data) => {
    //   const current = new AppCtx(tao.t, tao.a, tao.o, data);
    //   // ignore the initial AC b/c we use that to trigger {Router,Init,}
    //   if (current.key === initAc.key) {
    //     return;
    //   }
    //   const updatePath = this.getPathFrom(tao, data);
    //   if (updatePath != null) {
    //     this._history.push(updatePath);
    //   }
    // });
    if (incoming.length) {
      incoming.forEach(inAc => {
        TAO.addInlineHandler(inAc, (tao, data) => {
          console.log('Router::incoming AC handler:', { tao, data });
          let match = this._router.match(this._history.location.pathname);
          if (!match && defaultRoute) {
            match = this._router.match(defaultRoute);
            console.log(
              'Router::no match::match from default route "%s"',
              defaultRoute,
              match
            );
          }
          if (match) {
            reactToRoute(this._tao, match);
          }
          // const loc = this._history.location;
          // const acs = this.getAcsFrom(loc, tao, data);
          // acs.forEach(appCtx => {
          //   if (appCtx != null) {
          //     TAO.setAppCtx(appCtx);
          //   }
          // });
        });
      });
    }
  } //;

  // this should move to just being an added Async Handler on the individual routes
  // OR would that make the TAO sets too big?
  // they would certainly be completely directed with no middle man interpreter
  getPathFrom /*= */(tao, data) /* =>*/ {
    if (tao.a !== 'View') {
      return;
    }
    return tao.t === 'Space' ? '/space' : '';
  } //;

  getAcsFrom /*= */(location, tao, data) /* =>*/ {
    return [];
  } //;

  historyChange /*= */(location, action) /* =>*/ {
    // match the new location to our route tree to find Trigrams and fire ACs from path data
    console.log('history change:', { location, action });
    const match = this._router.match(location.pathname);
    console.log('matched:', match);
    if (CHANGE_ACTION_SIGNAL === action && match) {
      reactToRoute(this._tao, match);
    }
  } //;
}
