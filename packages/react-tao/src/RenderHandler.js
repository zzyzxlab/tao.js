import React, { useCallback, useEffect, useMemo, useState } from 'react';
import cartesian from 'cartesian';

import { normalizeClean, getPermutations } from './helpers';
import useTaoInlineSubscription from './useTaoInlineSubscription';

/** @typedef {import('./helpers').TrigramPart} TrigramPart */
/** @typedef {import('./helpers').TrigramProps} TrigramProps */
/** @typedef {import('./helpers').TaoSignal} TaoSignal */

/**
 * Render-prop children of {@link RenderHandler}: called with the matched
 * AppCon's trigram and data. Read named DataHandler data with
 * `useTaoData(name)` in a child component.
 * @callback RenderHandlerChildren
 * @param {TaoSignal} tao - trigram of the AppCon that matched (or `initialTao`)
 * @param {*} data - data of that AppCon (or `initialData`)
 * @returns {import('react').ReactNode}
 */

/**
 * Props for {@link RenderHandler}. Trigram parts (`t`/`term`, `a`/`action`,
 * `o`/`orient`) accept single values or arrays (multi-match); missing parts
 * are wildcards.
 * @typedef {Object} RenderHandlerProps
 * @property {TrigramPart} [term] - the term: the domain thing
 * @property {TrigramPart} [action] - the action: the operation on the term
 * @property {TrigramPart} [orient] - the orient: perspective / role / surface
 * @property {TrigramPart} [t] - the term (short key)
 * @property {TrigramPart} [a] - the action (short key)
 * @property {TrigramPart} [o] - the orient (short key)
 * @property {TrigramProps} [refreshOn] - extra trigram parts merged over the
 *           match trigram to also re-render on (e.g. `{ action: 'Refresh' }`);
 *           ignored when it normalizes to empty
 * @property {boolean} [debug=false] - log subscription/render diagnostics
 * @property {boolean} [shouldRender=false] - render immediately with
 *           `initialTao`/`initialData` before any signal arrives
 * @property {TaoSignal} [initialTao] - trigram passed to children before the
 *           first signal (with `shouldRender`)
 * @property {*} [initialData] - data passed to children before the first
 *           signal (with `shouldRender`)
 * @property {RenderHandlerChildren} children - render prop `(tao, data) => …`
 */

/**
 * Subscribes to the trigram(s) and calls its `children` render prop with the
 * latest matching AppCon (`(tao, data) => …`). Renders nothing until a
 * signal arrives unless `shouldRender` is set.
 * @param {RenderHandlerProps} props
 * @returns {import('react').ReactElement|null}
 */
function RenderHandler({
  term,
  action,
  orient,
  t,
  a,
  o,
  refreshOn,
  // Stryker disable next-line BooleanLiteral: debug defaults false; logging is optional
  debug = false,
  shouldRender: shouldRenderProp,
  initialTao,
  initialData,
  children,
}) {
  // Stryker disable next-line ObjectLiteral: initial snap shape
  const [snap, setSnap] = useState(() => ({
    shouldRender: !!shouldRenderProp,
    tao: initialTao,
    data: initialData,
  }));

  useEffect(() => {
    // Stryker disable all: optional debug logging
    debug &&
      console.log('RenderHandler::props:', {
        term,
        action,
        orient,
        t,
        a,
        o,
        refreshOn,
        shouldRender: shouldRenderProp,
        debug,
      });
    // Stryker restore all
  }, [debug, term, action, orient, t, a, o, refreshOn, shouldRenderProp]);

  useEffect(() => {
    if (!shouldRenderProp) {
      return;
    }
    setSnap((prev) => ({
      shouldRender: true,
      tao: initialTao !== undefined ? initialTao : prev.tao,
      data: initialData !== undefined ? initialData : prev.data,
    }));
  }, [shouldRenderProp, initialTao, initialData]);

  const onSignal = useCallback((tao, data) => {
    setSnap({ shouldRender: true, tao, data });
  }, []);

  const matchTrigrams = useMemo(
    () => getPermutations({ term, action, orient, t, a, o }),
    [term, action, orient, t, a, o],
  );

  const refreshTrigrams = useMemo(() => {
    if (!refreshOn) {
      return [];
    }
    const refresh = normalizeClean(refreshOn);
    if (!Object.keys(refresh).length) {
      return [];
    }
    return cartesian({
      ...normalizeClean({ term, action, orient, t, a, o }),
      ...refresh,
    });
  }, [term, action, orient, t, a, o, refreshOn]);

  const trigrams = useMemo(
    () => [...matchTrigrams, ...refreshTrigrams],
    [matchTrigrams, refreshTrigrams],
  );

  useTaoInlineSubscription(trigrams, onSignal);

  if (!snap.shouldRender) {
    return null;
  }

  const { tao, data } = snap;
  return <React.Fragment>{children(tao, data)}</React.Fragment>;
}

RenderHandler.displayName = 'RenderHandler';
RenderHandler.isTaoRenderHandler = true;

export default RenderHandler;
