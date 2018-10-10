import pathToRegexp from 'path-to-regexp';
import get from 'get-value';

const PATH_VAR_RE = /(\{([\w|\.]+)(\(.+\))?\})/m;
const DOT_REPLACER = '__0__';

const ISM_MAP = {
  t: 'term',
  a: 'action',
  o: 'orient'
};

// takes a path definition and provides:
// 1. a function that turns taople into a path to push onto history
// 2. a function that receives a url and converts it to a taople to set onto the TAO

function deconstructPath(origPath) {
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
              .replace('}', '')
          ),
      match: match
    };
  });
}

// convert path to usable path for path-to-regexp
function convertPath(deconstruction) {
  return deconstruction.map(p => p.use).join('/');
}

// function taopleToPathData(tao, data) {
//   return {
//     ...tao,
//     ...data,
//     term: data[tao.t],
//     action: data[tao.a],
//     orient: data[tao.o]
//   };
// }

function pathFlattenData(tao, data) {
  const pathData = { ...tao };
  for (let ism in tao) {
    const trigram = tao[ism];
    const taoism = ISM_MAP[ism];
    if (data[trigram] == null) {
      continue;
    }
    if (typeof data[trigram] !== 'object') {
      pathData[trigram] = data[trigram];
      pathData[taoism] = data[trigram];
      continue;
    }
    if (data[trigram] instanceof Array) {
      continue;
    }
    for (let prop in data[trigram]) {
      if (data[trigram][prop] == null) {
        continue;
      }
      const propData = data[trigram][prop];
      const propType = typeof propData;
      if (propType === 'object') {
        if (propData instanceof Array) {
          continue;
        }
        for (let subProp in propData) {
          const subPropData = propData[subProp];
          const subPropType = typeof subPropData;
          if (
            subPropData == null ||
            subPropType === 'object' ||
            subPropType === 'function'
          ) {
            continue;
          }
          pathData[
            `${trigram}${DOT_REPLACER}${prop}${DOT_REPLACER}${subPropData}`
          ] = propData;
          pathData[
            `${taoism}${DOT_REPLACER}${prop}${DOT_REPLACER}${subPropData}`
          ] = propData;
        }
      } else if (propType !== 'function') {
        pathData[`${trigram}${DOT_REPLACER}${prop}`] = propData;
        pathData[`${taoism}${DOT_REPLACER}${prop}`] = propData;
      }
    }
  }
  return pathData;
}

function pathDataGet(tao, data, deconstructedPath) {
  const allData = {
    ...tao,
    ...data,
    term: data[tao.t],
    action: data[tao.a],
    orient: data[tao.o]
  };
  console.log('pathDataGet::allData:', allData);
  return deconstructedPath.reduce((pathData, item) => {
    if (!item.match) {
      console.log('!item.match:', item);
      return pathData;
    }
    const getDataFrom = item.match[2];
    const needData = get(allData, getDataFrom);
    console.log('pathDataGet:', { getDataFrom, needData });
    if (needData == null) {
      return pathData;
    }
    pathData[item.use.substring(1)] = needData;
    return pathData;
  }, {});
}

function makeRouteHandler(history, route) {
  let pathString = route.path || route;
  const deconstructedPath = deconstructPath(pathString);
  const usablePath = convertPath(deconstructedPath);
  const toPath = pathToRegexp.compile(usablePath);
  return (tao, data) => {
    console.log('routeHandler::called with', { tao, data });
    // const pathData = pathFlattenData(tao, data);
    const pathData = pathDataGet(tao, data, deconstructedPath);
    console.log('routeHandler::pathData', pathData);
    let routeValue = toPath(pathData);
    if (route.lowerCase) {
      routeValue = routeValue.toLowerCase();
    }
    history.push(routeValue);
  };
}

export default makeRouteHandler;
