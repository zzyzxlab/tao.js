import debug from 'src/helpers/debug';

import request from './request';

const log = debug('api:apiRequester');

const ALWAYS_SEND_OPTIONS = {
  // credentials: 'include',
};

const SET_HEADERS = {
  'content-type': 'application/json'
};

const fetchClient = (url, options = {}) =>
  new Promise(async (resolve, reject) => {
    log('making call using:', { url, options });
    const headersToSend = new Headers();
    const { headers, ...otherOpts } = options;
    Object.entries(SET_HEADERS).forEach(([h, v]) => {
      headersToSend.set(h, v);
    });

    try {
      if (headers) {
        Object.entries(headers).forEach(([h, v]) => {
          if (SET_HEADERS[h.toLowerCase()]) {
            headersToSend.set(h, v);
          } else {
            headersToSend.append(h, v);
          }
        });
      }
      // // this line prevents this code from making it into the client via webpack define
      // if (!process.env.IS_BROWSER) {
      //   if (token) {
      //     headersToSend.append('Cookie', `${TOKEN_COOKIE_NAME}=${token}`);
      //   }
      // }
      const sendOptions = {
        ...ALWAYS_SEND_OPTIONS,
        ...otherOpts
      };
      if (sendOptions.body) {
        sendOptions.body = JSON.stringify(sendOptions.body);
      }
      sendOptions.headers = headersToSend;
      log('sending with headers:', headersToSend);

      const response = await request(url, sendOptions);

      // if (!response) {
      //   return reject({
      //     status: 'failed',
      //     message: `Request to ${endpoint} did not include 'response'`,
      //     meta: {
      //       fullUrl: url,
      //     },
      //   });
      // }

      // if (API_SUCCESS !== response.status) {
      //   return reject({
      //     status: response.status || 'failed',
      //     message: response.message || `Request to ${endpoint} did not include 'response.message'`,
      //     meta: {
      //       fullUrl: url,
      //     },
      //   });
      // }

      return resolve(response);
    } catch (reqError) {
      reqError.meta = {
        fullUrl: url
      };
      return reject(reqError);
    }
  });

export default fetchClient;
