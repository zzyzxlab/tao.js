/**
 * Runtime control surface returned by {@link TaoLogger}. Every option is
 * live-switchable after construction.
 *
 * @typedef {Object} TaoLoggerControls
 * @property {function(Object, Object): void} handler - the signal handler to
 *           attach (full-wildcard intercept idiom); receives `(tao, data)`
 *           and always returns undefined — pure observation, never halts
 * @property {function(boolean): void} doLogging - toggle logging entirely
 * @property {function(boolean): void} verbose - toggle datagram logging
 * @property {function(?number): void} depth - set the inspection depth
 * @property {function(boolean): void} group - toggle grouped output
 * @property {function(Object): void} setLogger - swap the console-like target
 * @property {function(?function(*, number): *): void} setInspect - swap the
 *           object formatter
 */

/**
 * The classic live signal logger (moved here from `@tao.js/utils`): logs
 * each signal's trigram — and, when verbose or grouped, the t/a/o portions
 * of its datagram — as it dispatches. Attach the returned `handler` as a
 * full-wildcard intercept: `TAO.addInterceptHandler({}, logger.handler)`.
 *
 * Shows the sequence of signals; the `Tracer` shows their causality.
 *
 * @export
 * @param {boolean} [doLogging=true] - master switch; the handler is a no-op
 *        when false
 * @param {Object} [opts]
 * @param {boolean} [opts.verbose=false] - also log the datagram portions
 *        (grouped output always does)
 * @param {?number} [opts.depth=0] - depth handed to `inspect`; when unset the
 *        datagram portions are logged raw
 * @param {boolean} [opts.group=false] - wrap each signal in
 *        `logger.groupCollapsed` / `logger.groupEnd`
 * @param {{ info: function, groupCollapsed?: function, groupEnd?: function }} [opts.logger=console] -
 *        console-like target
 * @param {?function(*, number): *} [opts.inspect] - object formatter (e.g.
 *        `util.inspect`) applied to each datagram portion at `depth`
 * @returns {TaoLoggerControls}
 */
export function TaoLogger(
  doLogging = true,
  {
    verbose = false,
    depth = 0,
    group = false,
    logger = console,
    inspect = null,
  } = {},
) {
  let inspector = null;
  if (
    // Stryker disable next-line ConditionalExpression: equivalent - whenever inspect is null/undefined the typeof clause below is also true, so this clause alone never changes the outcome
    inspect == null ||
    typeof inspect != 'function' ||
    (!depth && depth != null)
  ) {
    inspector = (obj) => obj;
  } else {
    inspector = (obj) => inspect(obj, depth);
  }
  return {
    handler: (tao, data) => {
      if (!doLogging) {
        return;
      }
      if (!group) {
        logger.info(`☯{${tao.t}, ${tao.a}, ${tao.o}}:`);
        if (!verbose) {
          return;
        }
      } else {
        logger.groupCollapsed(`☯{${tao.t}, ${tao.a}, ${tao.o}}:`);
      }
      logger.info(`${tao.t}:\n`, inspector(data[tao.t]));
      logger.info(`${tao.a}:\n`, inspector(data[tao.a]));
      logger.info(`${tao.o}:\n`, inspector(data[tao.o]));
      if (group) {
        logger.groupEnd();
      }
    },
    doLogging: (v) => {
      doLogging = !!v;
    },
    verbose: (v) => {
      verbose = !!v;
    },
    depth: (v) => {
      depth = v;
      if (
        // Stryker disable next-line ConditionalExpression: equivalent - whenever inspect is null/undefined the typeof clause below is also true, so this clause alone never changes the outcome
        inspect == null ||
        typeof inspect != 'function' ||
        (!v && v == null)
      ) {
        inspector = (obj) => obj;
      } else {
        inspector = (obj) => inspect(obj, depth);
      }
    },
    group: (v) => {
      group = !!v;
    },
    setLogger: (l) => {
      logger = l;
    },
    setInspect: (i) => {
      inspect = i;
      // Stryker disable next-line ConditionalExpression: equivalent - whenever i is null/undefined the typeof clause is also true, so the clause1-alone mutant never changes the outcome (other clauses on this line remain covered by tests)
      if (i == null || typeof i != 'function' || (!depth && depth == null)) {
        inspector = (obj) => obj;
      } else {
        inspector = (obj) => inspect(obj, depth);
      }
    },
  };
}
