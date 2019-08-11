import { AppCtx } from '@tao.js/core';
import * as urlHelpers from './url-helpers';
import fetchClient from './fetchclient';

const DEFAULT_PROTOCOL = 'https';
const DEFAULT_BASE_PATH = 'tao';
const ROUTE_RESPONSES = 'responses';
const ROUTE_CONTEXT = 'context';

function findErrorAs(errorTrigram) {
  if (errorTrigram.a || errorTrigram.action) {
    return 'action';
  } else if (errorTrigram.o || errorTrigram.orient) {
    return 'orient';
  } else if (errorTrigram.t || errorTrigram.term) {
    return 'term';
  }
  return 'action';
}

async function execHandler(
  protocol,
  host,
  rootPath,
  headers,
  errorTrigram,
  errorAs,
  tao,
  data
) {
  try {
    const rv = await fetchClient(
      `${protocol}://${host}/${rootPath}/${ROUTE_CONTEXT}`,
      {
        method: 'POST',
        body: { tao, data },
        headers: headers
      }
    );
    if (rv) {
      const { tao: trigram, data: d } = rv;
      if (trigram) {
        return new AppCtx(trigram.t, trigram.a, trigram.o, d);
      } else {
        return rv;
      }
    }
  } catch (error) {
    const trigram = {
      ...tao,
      ...errorTrigram
    };
    return new AppCtx(trigram.t, trigram.a, trigram.o, { [errorAs]: error });
  }
}

export default class TaoHttpClient {
  constructor(opts = {}) {
    this._protocol = opts.protocol || DEFAULT_PROTOCOL;
    this._host = opts.host || '';
    this._basePath = opts.basePath || DEFAULT_BASE_PATH;
    this._headers = opts.headers;
    this._errorTrigram = opts.errorAs;
    this._errorAs = findErrorAs(opts.errorAs);
    this._buildUrl = urlHelpers.buildApiUrl(opts);
  }

  handler = (tao, data) =>
    execHandler(
      this._protocol,
      this._host,
      this._basePath,
      this._headers,
      this._errorTrigram,
      this._errorAs,
      tao,
      data
    );

  makeHandler = (errorTrigram, errorAs) => (tao, data) =>
    execHandler(
      this._protocol,
      this._host,
      this._basePath,
      this._headers,
      errorTrigram,
      errorAs || findErrorAs(errorTrigram),
      tao,
      data
    );

  fetchResponses = async () => {
    const rv = await fetchClient(
      `${this._protocol}://${this._host}/${this._basePath}/${ROUTE_RESPONSES}`,
      {
        method: 'GET',
        headers: this._headers
      }
    );
    if (rv) {
      return rv.responses || [];
    }
    return [];
  };
}
