import { inspect } from 'util';

function inspectObject(obj, depth) {
  return inspect(obj, false, depth, true);
}

export function TaoLogger(
  doLogging = true,
  { verbose = false, depth = 0, group = false, logger = console } = {}
) {
  let inspector = null;
  if (!depth && depth !== null) {
    inspector = obj => obj;
  } else {
    inspector = obj => inspectObject(obj, depth);
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
      if (!v && !v === null) {
        inspector = obj => obj;
      } else {
        inspector = obj => inspectObject(obj, v);
      }
    },
    group: v => {
      group = !!v;
    },
    setLogger: l => {
      logger = l;
    }
  };
}
