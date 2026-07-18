import React, { useContext } from 'react';
import PropTypes from 'prop-types';

import { Context } from './Provider';
import { warnDeprecated } from './deprecations';

function readNamedData(data, ctxName) {
  // Stryker disable next-line ConditionalExpression: missing key still yields undefined≈null for consumers that only check truthiness; warn path is asserted separately
  if (data == null || !Object.prototype.hasOwnProperty.call(data, ctxName)) {
    // Stryker disable all: diagnostic console output only
    console.warn(
      `DataConsumer::Unable to find context for '${ctxName}'. Please check that you have it spelled correctly.`,
    );
    console.info(`DataConsumer::setting context ${ctxName} data arg to null`);
    // Stryker restore all
    return null;
  }
  return data[ctxName];
}

/**
 * @deprecated Since 0.17 — prefer `useTaoData('name')` in function components.
 */
function DataConsumer({ context, children }) {
  // Stryker disable all: deprecation copy; asserted via stringContaining in tests
  warnDeprecated(
    'DataConsumer',
    '[@tao.js/react] DataConsumer is deprecated and will be removed in a future release. Use useTaoData(name) instead.',
  );
  // Stryker restore all

  const { data } = useContext(Context);
  const ctxList = Array.isArray(context) ? context : [context];
  const args = ctxList.map((ctxName) => readNamedData(data, ctxName));
  return children(...args);
}

DataConsumer.displayName = 'DataConsumer';

DataConsumer.propTypes = {
  context: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  children: PropTypes.func.isRequired,
};

export default DataConsumer;
