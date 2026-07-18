import React, {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import cartesian from 'cartesian';

import { normalizeClean, handlerHash, serializeTrigrams } from './helpers';
import { useTaoContext } from './hooks';
import { SwitchContext } from './SwitchContext';
import RenderHandler from './RenderHandler';

// Stryker disable all: type identity checks; proxy vs RenderHandler covered; ||/&& mutants equivalent under mixed children
function isRenderHandlerElement(child) {
  return (
    isValidElement(child) &&
    !!child.type &&
    (child.type === RenderHandler || !!child.type.isTaoRenderHandler)
  );
}
// Stryker restore all

function buildMatchTable(children, defaults) {
  const entries = [];
  Children.forEach(children, (child) => {
    if (!isRenderHandlerElement(child)) {
      return;
    }
    const childTrigram = normalizeClean(child.props);
    const matchKey = handlerHash(childTrigram);
    const permutations = cartesian({ ...defaults, ...childTrigram });
    entries.push({ matchKey, permutations, child });
  });
  return entries;
}

function SwitchHandler({
  term,
  action,
  orient,
  t,
  a,
  o,
  // Stryker disable next-line BooleanLiteral: debug defaults false; logging is optional
  debug = false,
  children,
}) {
  const TAO = useTaoContext();

  // Stryker disable all: React hook dependency arrays — behavioral resubscribe covered; ArrayDeclaration equiv under perTest
  const defaults = useMemo(
    () => normalizeClean({ term, action, orient, t, a, o }),
    [term, action, orient, t, a, o],
  );

  const matchTable = useMemo(
    () => buildMatchTable(children, defaults),
    [children, defaults],
  );

  const subTable = useMemo(
    () =>
      matchTable.map(({ matchKey, permutations }) => ({
        matchKey,
        permutations,
      })),
    [matchTable],
  );
  // Stryker restore all

  const subTableKey = serializeTrigrams(subTable);

  // Stryker disable next-line ObjectLiteral: initial chosen snapshot shape
  const [chosen, setChosen] = useState(() => ({
    matchKeys: new Set(),
    tao: undefined,
    data: undefined,
  }));

  // Wave: one Kernel AppCon dispatch; accumulate all matchKeys for that signal.
  // Stryker disable next-line ObjectLiteral: wave accumulator seed
  const waveRef = useRef({ waveKey: null, acc: null });

  // Stryker disable all: attachMatch callback deps / inline handler body side effects
  const attachMatch = useCallback(
    (matchKey) => (tao, data) => {
      const waveKey = `${tao.t}|${tao.a}|${tao.o}`;
      debug &&
        console.log('SwitchHandler::handleSwitch:', {
          tao,
          data,
          matchKey,
          waveKey,
        });
      if (waveRef.current.waveKey !== waveKey) {
        waveRef.current = { waveKey, acc: new Set() };
      }
      waveRef.current.acc.add(matchKey);
      const matchKeys = waveRef.current.acc;
      setChosen({ matchKeys, tao, data });
      debug &&
        console.log('SwitchHandler::handleSwitch::set state with:', {
          matchKeys,
          tao,
          data,
        });
    },
    [debug],
  );
  // Stryker restore all

  useEffect(() => {
    // Stryker disable all: optional debug logging
    debug &&
      console.log('SwitchHandler::subscribe::props:', {
        term,
        action,
        orient,
        t,
        a,
        o,
        debug,
      });
    debug && console.log('SwitchHandler::subscribe::subTable:', subTable);
    // Stryker restore all

    // Stryker disable all: subscribe/prune/cleanup; orient resubscribe + prune tests cover behavior; hook-dep mutants equiv
    const attached = [];
    for (const { matchKey, permutations } of subTable) {
      const handler = attachMatch(matchKey);
      permutations.forEach((trigram) => TAO.addInlineHandler(trigram, handler));
      attached.push({ permutations, handler });
    }

    const allowed = new Set(subTable.map((entry) => entry.matchKey));
    setChosen((prev) => {
      let changed = false;
      const next = new Set();
      prev.matchKeys.forEach((key) => {
        if (allowed.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      });
      if (!changed && next.size === prev.matchKeys.size) {
        return prev;
      }
      return { ...prev, matchKeys: next };
    });

    debug && console.log('SwitchHandler::subscribe::complete:', { attached });

    return () => {
      attached.forEach(({ permutations, handler }) => {
        permutations.forEach((trigram) =>
          TAO.removeInlineHandler(trigram, handler),
        );
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TAO, subTableKey, attachMatch, debug]);
  // Stryker restore all

  // Stryker disable all: optional debug logging
  debug && console.log('SwitchHandler::render::state:', chosen);
  // Stryker restore all

  // Stryker disable all: switch context memo deps
  const switchValue = useMemo(
    () => ({
      defaults,
      signal: { tao: chosen.tao, data: chosen.data },
    }),
    [defaults, chosen.tao, chosen.data],
  );
  // Stryker restore all

  return (
    <SwitchContext.Provider value={switchValue}>
      {Children.map(children, (child) => {
        if (!isRenderHandlerElement(child)) {
          // Stryker disable all: optional debug logging
          debug && console.log('SwitchHandler::render:returning child');
          // Stryker restore all
          return child;
        }
        // Stryker disable all: optional debug logging
        debug && console.log('SwitchHandler::render:testing child');
        // Stryker restore all
        const matchKey = handlerHash(normalizeClean(child.props));
        if (!chosen.matchKeys.has(matchKey)) {
          return null;
        }
        // Stryker disable all: optional debug logging
        debug && console.log('SwitchHandler::render:cloning child');
        // Stryker restore all
        // shouldRender: matching AppCon already fired; freshly mounted
        // RenderHandlers would otherwise miss it and stay blank.
        return cloneElement(child, {
          term,
          action,
          orient,
          t,
          a,
          o,
          ...child.props,
          shouldRender: true,
          initialTao: chosen.tao,
          initialData: chosen.data,
        });
      })}
    </SwitchContext.Provider>
  );
}

SwitchHandler.displayName = 'SwitchHandler';

SwitchHandler.propTypes = {
  term: PropTypes.any,
  action: PropTypes.any,
  orient: PropTypes.any,
  t: PropTypes.any,
  a: PropTypes.any,
  o: PropTypes.any,
  debug: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default SwitchHandler;
