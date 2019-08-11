import queryString from 'query-string';

export function makeQueryString(params) {
  const paramsReady = Object.keys(params).reduce((acc, key) => {
    const val = params[key];
    acc[key] = typeof val === 'object' ? JSON.stringify(val) : val;
    return acc;
  }, {});
  return queryString.stringify(paramsReady);
}

export function buildApiUrl({ protocol, host, version, basePath, log }) {
  return endpoint => {
    log && log('called with:', { protocol, host, version, basePath, endpoint });
    if (host) {
      return `${protocol}://${host}${version}${basePath}${endpoint}`;
    }
    return `${version}${basePath}${endpoint}`;
  };
}

export function normalizePathPart(pathPart) {
  let path = '';
  if (!pathPart) {
    return path;
  }
  if (pathPart[0] !== '/') {
    path += '/';
  }
  if (pathPart[pathPart.length - 1] === '/') {
    path += pathPart.substring(0, pathPart.length - 1);
  } else {
    path += pathPart;
  }
  return path;
}
