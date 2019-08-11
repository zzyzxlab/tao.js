import debug from 'src/helpers/debug';
// import fetch from 'fetch-everywhere';

const log = debug('api:request');

const MIME_JSON = 'application/json';
const MIME_APPLICATION_VND_RE = /application\/vnd\./i;
const MIME_TEXT_TYPE_RE = /^(text\/.*|application\/(javascript|ecmascript|typescript|x-sh)|.*xml)/i;

export default async function request(url, options) {
  log('requesting...', { url, options });
  const response = await fetch(url, options);
  log('response', { url, response });
  log('content-length:', response.headers.get('content-length'));
  log('content-type:', response.headers.get('content-type'));

  let hasBody = true;

  if (
    response.headers.has('content-length') &&
    Number(response.headers.get('content-length')) <= 0
  ) {
    hasBody = false;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType.indexOf(MIME_JSON) > -1;
  const isText =
    !isJson &&
    !MIME_APPLICATION_VND_RE.test(contentType) &&
    MIME_TEXT_TYPE_RE.test(contentType);

  let body = null;
  if (hasBody) {
    if (isJson) {
      body = await response.json();
    } else if (isText) {
      body = await response.text();
    } else {
      body = await response.blob();
    }
    if (!body) {
      const errorMsg = `Response from ${url} expected body content and received nothing`;
      const err = new Error(errorMsg);
      err.status = 513;
      err.statusText = 'Missing Body';
      throw err;
    }
  }

  if (response.status >= 400) {
    const errorMsg =
      body.message ||
      body ||
      `Response error: ${url} resulted in ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.statusText = response.statusText;
    throw err;
  }

  return hasBody
    ? body
    : {
        success: true,
        message: response.statusText
      };
}
