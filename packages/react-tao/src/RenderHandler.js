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

function RenderHandler({
  term,
  action,
  orient,
  t,
  a,
  o,
  context,
  refreshOn,
  debug = false,
  shouldRender: shouldRenderProp,
  initialTao,
  initialData,
  children,
}) {
  const { data: dataBag } = useContext(Context);

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
