const warned = new Set();

/**
 * Dev-only, once-per-process deprecation warning (see AGENTS.md data-context migration).
 */
export function warnDeprecated(key, message) {
  // Stryker disable next-line all: NODE_ENV / process guards; production path covered in deprecations.spec
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return;
  }
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  console.warn(message);
}

/** @private test helper — ignored by mutation (test harness only) */
// Stryker disable all: test-only reset helper
export function _resetDeprecationWarnings() {
  warned.clear();
}
// Stryker restore all
