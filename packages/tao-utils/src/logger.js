export function TaoLogger(
  doLogging = true,
  {
    verbose = false,
    depth = 0,
    group = false,
    logger = console,
    inspect = null
  } = {}
) {
  let inspector = null;
  if (
    inspect == null ||
    typeof inspect != 'function' ||
    (!depth && depth != null)
  ) {
    inspector = obj => obj;
  } else {
    inspector = obj => inspect(obj, depth);
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
    doLogging: v => {
      doLogging = !!v;
    },
    verbose: v => {
      verbose = !!v;
    },
    depth: v => {
      depth = v;
      if (
        inspect == null ||
        typeof inspect != 'function' ||
        (!v && !v === null)
      ) {
        inspector = obj => obj;
      } else {
        inspector = obj => inspect(obj, depth);
      }
    },
    group: v => {
      group = !!v;
    },
    setLogger: l => {
      logger = l;
    },
    setInspect: i => {
      inspect = i;
      if (i == null || typeof i != 'function' || (!depth && !depth === null)) {
        inspector = obj => obj;
      } else {
        inspector = obj => inspect(obj, depth);
      }
    }
  };
}
