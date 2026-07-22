const HEX = '0123456789abcdef';
const ALL_ZEROS = /^0+$/;
const TRACE_ID_RX = /^[0-9a-f]{32}$/;
const SPAN_ID_RX = /^[0-9a-f]{16}$/;
const VERSION_RX = /^[0-9a-f]{2}$/;

function randomHex(chars) {
  // Stryker disable next-line ConditionalExpression,StringLiteral: equivalent - globalThis always exists in every runnable JS environment we can test; the guard is for exotic embedders
  const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(chars / 2);
    cryptoObj.getRandomValues(bytes);
    let out = '';
    for (const byte of bytes) {
      out += HEX[byte >> 4] + HEX[byte & 15];
    }
    return out;
  }
  let out = '';
  for (let i = 0; i < chars; i++) {
    out += HEX[(Math.random() * 16) | 0];
  }
  return out;
}

/**
 * Generate a new W3C-compatible trace id (32 lowercase hex chars, non-zero).
 */
export function newTraceId() {
  let id;
  do {
    id = randomHex(32);
  } while (ALL_ZEROS.test(id));
  return id;
}

/**
 * Generate a new W3C-compatible span/signal id (16 lowercase hex chars, non-zero).
 */
export function newSignalId() {
  let id;
  do {
    id = randomHex(16);
  } while (ALL_ZEROS.test(id));
  return id;
}

/**
 * Format a signal stamp or record as a W3C `traceparent` header value.
 *
 * @param {{ traceId: string, signalId: string }} stamp
 * @returns {string} e.g. `00-<32 hex>-<16 hex>-01`
 */
export function toTraceparent({ traceId, signalId }) {
  return `00-${traceId}-${signalId}-01`;
}

/**
 * Parse a W3C `traceparent` header value into trace continuation context.
 *
 * @param {string} header
 * @returns {{ traceId: string, parentId: string } | null} null when malformed
 */
export function parseTraceparent(header) {
  if (typeof header !== 'string') {
    return null;
  }
  const parts = header.trim().toLowerCase().split('-');
  if (parts.length < 4) {
    return null;
  }
  const [version, traceId, parentId] = parts;
  if (!VERSION_RX.test(version) || version === 'ff') {
    return null;
  }
  if (!TRACE_ID_RX.test(traceId) || ALL_ZEROS.test(traceId)) {
    return null;
  }
  if (!SPAN_ID_RX.test(parentId) || ALL_ZEROS.test(parentId)) {
    return null;
  }
  return { traceId, parentId };
}
