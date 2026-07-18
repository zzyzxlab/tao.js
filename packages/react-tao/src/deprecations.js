const warned = new Set();

/**
 * Dev-only, once-per-process deprecation warning (see AGENTS.md data-context migration).
 */
export function warnDeprecated(key, message) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return;
  }
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  console.warn(message);
}

/** @private test helper */
export function _resetDeprecationWarnings() {
  warned.clear();
}
