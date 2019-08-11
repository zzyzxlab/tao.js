import invariant from 'invariant';
import pathToRegExp from 'path-to-regexp';
import Validation from 'data.validation';

import debug from 'src/helpers/debug';
import apiRequester from 'modules/api/apiRequester';
import ServiceError from './ServiceError';
import * as types from './types';
import * as urlHelpers from './url-helpers';

const log = debug('services:Requester');

const METHOD_GET = 'GET';
const METHOD_HEAD = 'HEAD';

const HTTP_TO_SERVICE_ERROR = {
  400: types.INVALID_PARAMETERS,
  401: types.NOT_AUTHENTICATED,
  403: types.UNAUTHORIZED,
  404: types.NOT_FOUND,
  405: types.ILLEGAL_CALL,
  408: types.TIMEOUT,
  // more 400s to map
  500: types.SERVICE_ERROR,
  default: types.SERVICE_ERROR
};

function isBodylessRequest(method) {
  return method === METHOD_GET || method === METHOD_HEAD;
}

/**
 * implements the IServiceStrategy interface which is:
 * (definition) => (callDef) => (params, authToken, ...opts) => Validation
 * where callDef := { method = 'GET', endpoint, baseOptions?, dupParams:[]? }
 * dupParams - set of parameters that are duplicated in the URL and Body of a Request
 *   - this often happens with {id} params
 */
function Requester(definition) {
  invariant(definition, 'cannot create a Requester without a definition');
  // if (!definition) {
  //   return () => () =>
  //     Validation.Failure({
  //       type: 'services/NO_DEFINITION',
  //       isNoService: true,
  //     });
  // }
  const {
    protocol = 'https',
    host = '',
    basePath = '',
    version = '',
    options: svcOptions = {}
  } = definition;
  const buildUrl = urlHelpers.buildApiUrl({
    protocol,
    host,
    version: urlHelpers.normalizePathPart(version),
    basePath: urlHelpers.normalizePathPart(basePath),
    log
  });
  // must return (callDef) => {implementation}
  // where {implementation} := (params, opts) => Validation
  return ({
    method = METHOD_GET,
    endpoint = '',
    options: callOptions = {},
    dupParams = []
  }) => {
    log('generating service call on endpoint:', endpoint);
    let keys = [];
    // let's get the keys in the url for later matching
    let p2r = pathToRegExp(endpoint, keys); // eslint-ignore: no-unused-vars
    p2r = null; // explicitly clean up unneeded refs
    const getPath = pathToRegExp.compile(endpoint);
    const urlParams = keys.map(k => k.name);
    keys = null; // clean up unneeded refs

    return async ({ params, authToken, ...options }) => {
      log('making call with:', { params, authToken, options });
      const endpointPath = urlHelpers.normalizePathPart(getPath(params));
      const body = Object.entries(params)
        .filter(([p, v]) => dupParams.includes(p) || !urlParams.includes(p))
        .reduce((acc, [p, v]) => {
          acc[p] = v;
          return acc;
        }, {});
      const qs = isBodylessRequest(method)
        ? `${urlHelpers.makeQueryString(body)}`
        : '';
      const urlPath = qs ? `${endpointPath}?${qs}` : endpointPath;
      const url = buildUrl(urlPath);
      const combinedOptions = {
        ...svcOptions,
        ...callOptions,
        ...options,
        headers: {
          ...svcOptions.headers,
          ...callOptions.headers,
          ...options.headers,
          Authorization: authToken
        }
      };

      try {
        const result = await apiRequester(url, {
          // Authorization: authToken,
          ...combinedOptions,
          body: isBodylessRequest(method) ? undefined : body,
          method: method
        });
        return Validation.Success(result);
      } catch (reqError) {
        const errorType =
          HTTP_TO_SERVICE_ERROR[reqError.status] ||
          HTTP_TO_SERVICE_ERROR.default;
        const serviceError = new ServiceError(
          errorType,
          {
            ...combinedOptions,
            ...reqError.meta
          },
          reqError.message
        );
        return Validation.Failure(serviceError);
      }
    };
  };
}

export default Requester;
