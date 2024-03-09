import { AppCtx } from '@tao.js/core';

const IDENTITY = val => val;

/**
 * Transfer the trigram and datagrams into a new Signal as an AppCtx
 *
 * @param {*} tao signal trigram that you want to transfer from
 * @param {*} data signal datagram that you want to transfer from
 * @param {*} to signal trigram that you want to transfer to - any missing trigram (t, a, or o) will use the value from the `tao` argument
 * @param {{
 *   transformTerm: function,
 *   transformAction: function,
 *   transformOrient: function,
 * }} options optional functions to transform the datagrams in the new AppCtx
 * @returns AppCtx with the trigram of the `to` argument and the data from the `data` argument
 */
export function transferToAppCtx(
  tao,
  data,
  to,
  {
    transformTerm = IDENTITY,
    transformAction = IDENTITY,
    transformOrient = IDENTITY
  } = {}
) {
  const { t, term, a, action, o, orient } = to;
  return new AppCtx(
    t || term || tao.t,
    a || action || tao.a,
    o || orient || tao.o,
    transformTerm(data[tao.t]),
    transformAction(data[tao.a]),
    transformOrient(data[tao.o])
  );
}

function buildErrorDatagram(tao, data, error) {
  const fail = {
    reason: typeof error === 'string' ? error : error.message,
    a: tao.a,
    [tao.a]: data[tao.a]
  };
  if (typeof error !== 'string') {
    fail.error = error;
  }
  if (error.response && error.response.data) {
    fail.response = error.response.data;
  }
  return fail;
}

/**
 * Transfer the trigram, datagrams and an error into a new AppCtx that
 * signals the Error
 *
 * @param {*} tao signal trigram that you want to transfer from
 * @param {*} data signal datagram that you want to transfer from
 * @param {error | string} error error that is either an Error or a String message
 * @param {{
 *   action: string,
 *   transformTerm: function,
 *   transformAction: function,
 *   transformOrient: function,
 * }} options optional functions to transform the datagrams in the new AppCtx
 * @returns AppCtx with the trigram of the { `tao.t`, `action` [`'fail'`], `tao.o` }
 * argument and the datagrams from the `data` argument with the error
 */
export function transferError(
  tao,
  data,
  error,
  {
    action = 'fail',
    transformTerm = IDENTITY,
    transformAction = IDENTITY,
    transformOrient = IDENTITY
  } = {}
) {
  return transferToAppCtx(
    tao,
    data,
    { action },
    {
      transformTerm,
      transformAction: () => {
        const fail = buildErrorDatagram(tao, data, error);
        return transformAction(fail);
      },
      transformOrient
    }
  );
}
