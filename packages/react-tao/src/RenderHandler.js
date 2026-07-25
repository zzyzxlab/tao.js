import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import cartesian from 'cartesian';

import { normalizeClean, getPermutations } from './helpers';
import { Context } from './Provider';
import useTaoInlineSubscription from './useTaoInlineSubscription';
import { warnDeprecated } from './deprecations';

/** @typedef {import('./helpers').TrigramPart} TrigramPart */
/** @typedef {import('./helpers').TrigramProps} TrigramProps */
/** @typedef {import('./helpers').TaoSignal} TaoSignal */

/**
 * Render-prop children of {@link RenderHandler}: called with the matched
 * AppCon's trigram and data. Extra positional `contextData` args are only
 * appended when the deprecated `context` prop is used.
 * @callback RenderHandlerChildren
 * @param {TaoSignal} tao - trigram of the AppCon that matched (or `initialTao`)
 * @param {*} data - data of that AppCon (or `initialData`)
 * @param {...*} contextData - deprecated: data-bag values for the `context`
 *        prop names, in order — use `useTaoData(name)` in a child instead
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
 * @property {string|string[]} [context] - deprecated (removal planned):
 *           DataHandler name(s) appended to the render prop as positional
 *           args — use `useTaoData(name)` in a child component instead
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
 * Read one named value from the deprecated Provider data bag.
 * @param {Object<string, *>} dataBag
 * @param {string} ctxName
 * @returns {*}
 */
function readNamedData(dataBag, ctxName) {
  // Stryker disable all: dataBag==null short-circuit redundant with Provider {}; console is diagnostic
  if (
    dataBag == null ||
    !Object.prototype.hasOwnProperty.call(dataBag, ctxName)
  ) {
    console.warn(
      `RenderHandler::Unable to find context for '${ctxName}'. Please check that you have it spelled correctly.`,
    );
    console.info(`RenderHandler::setting context ${ctxName} data arg to null`);
    return null;
  }
  // Stryker restore all
  return dataBag[ctxName];
}

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
  context,
  refreshOn,
  // Stryker disable next-line BooleanLiteral: debug defaults false; logging is optional
  debug = false,
  shouldRender: shouldRenderProp,
  initialTao,
  initialData,
  children,
}) {
  const { data: dataBag } = useContext(Context);

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
        context,
        refreshOn,
        shouldRender: shouldRenderProp,
        debug,
      });
    // Stryker restore all
  }, [
    debug,
    term,
    action,
    orient,
    t,
    a,
    o,
    context,
    refreshOn,
    shouldRenderProp,
  ]);

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
  // Stryker disable next-line all: no-context path is covered; empty-block fallthrough still invokes children
  if (!context) {
    return <React.Fragment>{children(tao, data)}</React.Fragment>;
  }
  warnDeprecated(
    'RenderHandler.context',
    '[@tao.js/react] RenderHandler `context` prop is deprecated and will be removed in a future release. Use useTaoData(name) in a child component instead of positional render-prop args.',
  );
  const ctxList = Array.isArray(context) ? context : [context];
  const ctxArgs = ctxList.map((ctxName) => readNamedData(dataBag, ctxName));
  return <React.Fragment>{children(tao, data, ...ctxArgs)}</React.Fragment>;
}

RenderHandler.displayName = 'RenderHandler';
RenderHandler.isTaoRenderHandler = true;

RenderHandler.propTypes = {
  term: PropTypes.any,
  action: PropTypes.any,
  orient: PropTypes.any,
  t: PropTypes.any,
  a: PropTypes.any,
  o: PropTypes.any,
  context: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  refreshOn: PropTypes.any,
  debug: PropTypes.bool,
  shouldRender: PropTypes.bool,
  initialTao: PropTypes.any,
  initialData: PropTypes.any,
  children: PropTypes.func.isRequired,
};

export default RenderHandler;
