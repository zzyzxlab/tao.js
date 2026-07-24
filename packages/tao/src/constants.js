/** Trigram part that matches any value; a missing or empty part means the same. */
export const WILDCARD = '*';
/** Handler phase: runs first; a truthy return halts the signal, an AppCtx return diverts it. */
export const INTERCEPT = 'Intercept';
/** Handler phase: forked outside the caller's synchronous flow after intercepts pass. */
export const ASYNC = 'Async';
/** Handler phase: runs in the caller's execution context; returned AppCtxs spool, then set. */
export const INLINE = 'Inline';
/** Settlement phase reported to `onReturn` for thrown handler errors (not a handler phase). */
export const ERROR = 'Error';
