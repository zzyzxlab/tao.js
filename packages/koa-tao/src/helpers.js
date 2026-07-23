import { TRACE_CHAIN, parseTraceparent } from '@tao.js/telemetry';

export const noop = () => {};

export function normalizeAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o,
  };
}

export const cleanInput = ({ term, action, orient }) => {
  const incoming = { term, action, orient };
  Object.keys(incoming).forEach(
    (k) => incoming[k] == null && delete incoming[k],
  );
  return incoming;
};

/**
 * Continue an inbound W3C `traceparent` header as entry chain state
 * (ENVELOPE-SPEC.md §9: request/response transports map the tracing chain
 * key to `traceparent`). Absent or malformed headers yield `null`.
 */
export function chainFromRequest(ctx) {
  const header =
    ctx && ctx.request && ctx.request.headers
      ? ctx.request.headers.traceparent
      : undefined;
  // parseTraceparent rejects non-strings and malformed headers itself
  const remote = parseTraceparent(header);
  if (!remote) {
    return null;
  }
  return {
    [TRACE_CHAIN]: { traceId: remote.traceId, signalId: remote.parentId },
  };
}
