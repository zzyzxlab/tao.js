import createHistory from 'history/createBrowserHistory';
import { AppCtx } from '@tao.js/core';

function locationHandler(history, route) {
  return () => {
    history.push(route.path || route);
  };
}

function wrapAc(ac) {
  return ac instanceof AppCtx ? ac : new AppCtx(ac.t, ac.a, ac.o);
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
    this.getAcFrom = this.getAcFrom.bind(this);
    this._routes = new Map();
    this.setupEvents(
      TAO,
      this._history,
      opts.initAc,
      opts.incomingAc,
      opts.orient
    );
  }

  setupEvents /*= */(TAO, history, initAc, incomingAc, orient) /* =>*/ {
    this._unlistenHistory = history.listen(this.historyChange);
    TAO.addAsyncHandler(initAc, (tao, data) => {
      return new AppCtx('Router', 'Init', tao.o);
    });
    TAO.addInlineHandler(
      { t: 'Routes', a: 'Configure', o: orient },
      (tao, { Routes, Configure }) => {
        const routes = Array.isArray(Routes) ? Routes : [Routes];
        routes.forEach((r, i) => {
          const config = Configure[i];
          if (config.Add) {
            TAO.setCtx({ t: 'Route', a: 'Add', o: tao.o }, [r, config.Add]);
          }
          if (config.Remove) {
            TAO.setCtx({ t: 'Route', a: 'Remove', o: tao.o }, [
              r,
              config.Remove
            ]);
          }
          if (config.Match) {
            TAO.setCtx({ t: 'Route', a: 'Match', o: tao.o }, [r, config.Match]);
          }
          if (config.Unmatch) {
            TAO.setCtx({ t: 'Route', a: 'Unmatch', o: tao.o }, [
              r,
              config.Unmatch
            ]);
          }
        });
      }
    );
    TAO.addInlineHandler(
      { t: 'Route', a: 'Add', o: orient },
      (tao, { Route, Add }) => {
        // add Route to the Router's configuration
        console.log(`adding to Route ${Route}:`, Add);
        const routeHandler = locationHandler(history, Route);
        const trigram = wrapAc(Add);
        this._routes.set(trigram.key, routeHandler);
        TAO.addAsyncHandler(trigram.unwrapCtx(), routeHandler);
      }
    );
    TAO.addInlineHandler(
      { t: 'Route', a: 'Remove', o: orient },
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
    if (incomingAc) {
      TAO.addInlineHandler(incomingAc, () => {
        const loc = this._history.location;
        const ac = this.getAcFrom(loc);
        if (ac != null) {
          TAO.setAppCtx(ac);
        }
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

  getAcFrom /*= */(location) /* =>*/ {
    return;
  } //;

  historyChange /*= */(location, action) /* =>*/ {
    console.log('history change:', { location, action });
  } //;
}
