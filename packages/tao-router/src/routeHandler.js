/**
 * Path-template plumbing for the legacy TAO-native Router: deconstruct
 * `{data.path}` templates, convert them for `path-to-regexp`, and build the
 * async route handler that pushes an AppCon's URL onto history.
 *
 * @module @tao.js/router/routeHandler
 */
import pathToRegexp from 'path-to-regexp';
import get from 'get-value';

import { AppCtx } from '@tao.js/core';

/** @typedef {import('@tao.js/core').Handler} Handler */

/**
 * Structural shape of the history object this package drives —
 * `createBrowserHistory` from the bundled `history` v4 is the default, and
 * any object with these members works (memory history, mocks).
 *
 * @typedef {Object} HistoryLike
 * @property {{ pathname: string }} location - the current location
 * @property {function(string): void} push - push a new path onto history
 * @property {function(function(Object, string): void): function(): void} listen -
 *           subscribe to location changes as `(location, action)`; returns
 *           an unlisten function
 */

/**
 * A route definition: a path template string, or an object holding one at
 * `path` (plus `lowerCase` to canonicalize pushed URLs). Templates embed
 * data paths in `{…}` placeholders — e.g. `/users/{User.id}/{t}` — where
 * each placeholder is a `get-value` path resolved against the AppCon
 * (trigram short keys `t`/`a`/`o`, the datum aliases
 * `term`/`action`/`orient`, and the AppCon data).
 *
 * @typedef {(string|{ path: string, lowerCase?: boolean })} RouteConfig
 */

/**
 * One segment of a deconstructed path template.
 *
 * @typedef {Object} PathPart
 * @property {string} part - the original path segment
 * @property {number} idx - the segment's index in the path
 * @property {string} use - the segment converted for `path-to-regexp`
 *           (`:param` form, `.` encoded as `__0__`)
 * @property {(RegExpExecArray|null)} match - the `{data.path}` placeholder
 *           match when the segment holds one (`match[2]` is the `get-value`
 *           data path); `null` for literal segments
 */

const PATH_VAR_RE = /(\{((\w|\.)+)(\(.+\))?\})/m;
const DOT_REPLACER = '__0__';

// const ISM_MAP = {
//   t: 'term',
//   a: 'action',
//   o: 'orient'
// };

// takes a path definition and provides:
// 1. a function that turns trigram into a path to push onto history
// 2. a function that receives a url and converts it to a trigram to set onto the TAO

/**
 * Split a path template into per-segment {@link PathPart}s, converting
 * `{data.path}` placeholders into `path-to-regexp` `:param` form (dots
 * encoded as `__0__`).
 *
 * @param {string} origPath - the path template (e.g. `/users/{User.id}`)
 * @returns {PathPart[]}
 */
export function deconstructPath(origPath) {
  return origPath.split('/').map((p, i) => {
    const match = PATH_VAR_RE.exec(p);
    return {
      part: p,
      idx: i,
      use: !match
        ? p
        : p.replace(
            match[1],
            match[1]
              .replace(/\./g, DOT_REPLACER)
              .replace('{', ':')
              .replace('}', ''),
          ),
      match: match,
    };
  });
}

/**
 * Reassemble a deconstructed path into the `path-to-regexp`-usable form
 * (each segment's `use`).
 *
 * @param {PathPart[]} deconstruction - from {@link deconstructPath}
 * @returns {string}
 */
// convert path to usable path for path-to-regexp
export function convertPath(deconstruction) {
  return deconstruction.map((p) => p.use).join('/');
}

// function pathFlattenData(tao, data) {
//   const pathData = { ...tao };
//   for (let ism in tao) {
//     const trigram = tao[ism];
//     const taoism = ISM_MAP[ism];
//     if (data[trigram] == null) {
//       continue;
//     }
//     if (typeof data[trigram] !== 'object') {
//       pathData[trigram] = data[trigram];
//       pathData[taoism] = data[trigram];
//       continue;
//     }
//     if (data[trigram] instanceof Array) {
//       continue;
//     }
//     for (let prop in data[trigram]) {
//       if (data[trigram][prop] == null) {
//         continue;
//       }
//       const propData = data[trigram][prop];
//       const propType = typeof propData;
//       if (propType === 'object') {
//         if (propData instanceof Array) {
//           continue;
//         }
//         for (let subProp in propData) {
//           const subPropData = propData[subProp];
//           const subPropType = typeof subPropData;
//           if (
//             subPropData == null ||
//             subPropType === 'object' ||
//             subPropType === 'function'
//           ) {
//             continue;
//           }
//           pathData[
//             `${trigram}${DOT_REPLACER}${prop}${DOT_REPLACER}${subPropData}`
//           ] = propData;
//           pathData[
//             `${taoism}${DOT_REPLACER}${prop}${DOT_REPLACER}${subPropData}`
//           ] = propData;
//         }
//       } else if (propType !== 'function') {
//         pathData[`${trigram}${DOT_REPLACER}${prop}`] = propData;
//         pathData[`${taoism}${DOT_REPLACER}${prop}`] = propData;
//       }
//     }
//   }
//   return pathData;
// }

/**
 * Collect the path parameters for a handled AppCon: each placeholder's
 * `get-value` path is resolved against the trigram (`t`/`a`/`o`), the
 * datum aliases (`term`/`action`/`orient` → `data[t]`/`data[a]`/`data[o]`),
 * and the AppCon data; nullish resolutions are omitted.
 *
 * @param {Object} tao - the concrete `{ t, a, o }` trigram handled
 * @param {Object} data - the AppCon data
 * @param {PathPart[]} deconstructedPath - from {@link deconstructPath}
 * @returns {Object.<string, *>} `path-to-regexp` params keyed by `:param`
 *          name
 */
function pathDataGet(tao, data, deconstructedPath) {
  const allData = {
    ...tao,
    ...data,
    term: data[tao.t],
    action: data[tao.a],
    orient: data[tao.o],
  };
  // console.log('pathDataGet::allData:', allData);
  return deconstructedPath.reduce((pathData, item) => {
    if (!item.match) {
      // console.log('!item.match:', item);
      return pathData;
    }
    const getDataFrom = item.match[2];
    const needData = get(allData, getDataFrom);
    // console.log('pathDataGet:', { getDataFrom, needData });
    // Stryker disable next-line ConditionalExpression,BlockStatement: equivalent - path-to-regexp's compiled path function throws the identical "Expected ... to be a string" error whether the param key is omitted or explicitly set to null/undefined, so skipping vs falling through here is unobservable
    if (needData == null) {
      return pathData;
    }
    pathData[item.use.substring(1)] = needData;
    return pathData;
  }, {});
}

/**
 * Compile a route into the async handler the Router registers for the
 * route's attached trigram: on a matching AppCon it builds the URL from
 * the AppCon's data (lowercased when `route.lowerCase`), and — only when
 * it differs from the current location — pushes it onto history and chains
 * `{Route,Set,<orient of the signal>}` with `{ Route: <route>, Set: <path> }`.
 *
 * @param {HistoryLike} history - the history to push routes onto
 * @param {RouteConfig} route - the route to compile
 * @param {boolean} [debug=false] - console.log handler activity
 * @returns {Handler} the async route handler `(tao, data) => AppCtx|undefined`
 */
function makeRouteHandler(history, route, debug = false) {
  let pathString = /** @type {{ path?: string }} */ (route).path || route;
  const deconstructedPath = deconstructPath(/** @type {string} */ (pathString));
  const usablePath = convertPath(deconstructedPath);
  const toPath = pathToRegexp.compile(usablePath);
  return (tao, data) => {
    // Stryker disable all: optional debug logging
    debug && console.log('routeHandler::called with', { tao, data });
    // Stryker restore all
    // const pathData = pathFlattenData(tao, data);
    const pathData = pathDataGet(tao, data, deconstructedPath);
    // Stryker disable next-line all: optional debug logging
    debug && console.log('routeHandler::pathData', pathData);
    let routeValue = toPath(pathData);
    if (/** @type {{ lowerCase?: boolean }} */ (route).lowerCase) {
      routeValue = routeValue.toLowerCase();
    }
    if (history.location.pathname !== routeValue) {
      history.push(routeValue);
      return new AppCtx('Route', 'Set', tao.o, {
        Route: route,
        Set: routeValue,
      });
    }
  };
}

export default makeRouteHandler;
