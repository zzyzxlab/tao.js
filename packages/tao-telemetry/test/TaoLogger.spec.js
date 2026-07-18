import { TaoLogger } from '../src/TaoLogger';

const DATA = {
  Source: { id: 1 },
  Load: { pending: false },
  Page: { current: true },
};

describe('TaoLogger', () => {
  const tao = { t: 'Source', a: 'Load', o: 'Page' };

  it('supports disabled, terse, verbose, grouped, and inspected logging', () => {
    const logger = {
      info: jest.fn(),
      groupCollapsed: jest.fn(),
      groupEnd: jest.fn(),
    };
    const inspect = jest.fn((value, depth) => ({ value, depth }));
    const log = TaoLogger(false, { logger, inspect, depth: 2 });

    log.handler(tao, DATA);
    expect(logger.info).not.toHaveBeenCalled();

    log.doLogging(true);
    log.handler(tao, DATA);
    expect(logger.info).toHaveBeenCalledTimes(1);

    log.verbose(true);
    log.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, 2);

    log.group(true);
    log.handler(tao, DATA);
    expect(logger.groupCollapsed).toHaveBeenCalledWith(
      '☯{Source, Load, Page}:',
    );
    expect(logger.groupEnd).toHaveBeenCalledTimes(1);

    log.depth(0);
    log.setInspect(null);
    log.setLogger(logger);
    log.handler(tao, DATA);
    expect(logger.info).toHaveBeenCalled();
    log.setInspect(inspect);
    log.depth(null);
    log.handler(tao, DATA);
    log.depth(1);
    log.handler(tao, DATA);
    log.setInspect(inspect);
    log.handler(tao, DATA);

    TaoLogger(true, { logger, verbose: true, inspect: 'invalid' }).handler(
      tao,
      DATA,
    );
  });

  it('uses the identity inspector for a zero depth', () => {
    const logger = { info: jest.fn() };
    const inspect = jest.fn();

    TaoLogger(true, { logger, verbose: true, inspect, depth: 0 }).handler(
      tao,
      DATA,
    );

    expect(inspect).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);
  });

  it('defaults doLogging to true and logger to console when constructed without arguments', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});

    TaoLogger().handler(tao, DATA);

    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it('logs the exact terse and verbose trigram/datum strings', () => {
    const logger = { info: jest.fn(), groupCollapsed: jest.fn() };

    TaoLogger(true, { logger }).handler(tao, DATA);
    expect(logger.info).toHaveBeenCalledWith('☯{Source, Load, Page}:');

    logger.info.mockClear();
    TaoLogger(true, { logger, verbose: true }).handler(tao, DATA);
    expect(logger.info).toHaveBeenNthCalledWith(1, '☯{Source, Load, Page}:');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'Source:\n', DATA.Source);
    expect(logger.info).toHaveBeenNthCalledWith(3, 'Load:\n', DATA.Load);
    expect(logger.info).toHaveBeenNthCalledWith(4, 'Page:\n', DATA.Page);
  });

  it('chooses the identity vs. real inspector for every constructor depth/inspect combination', () => {
    const logger = { info: jest.fn() };
    const inspect = jest.fn((value, depth) => ({ value, depth }));

    const missingInspect = TaoLogger(true, { logger, verbose: true });
    missingInspect.handler(tao, DATA);
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);

    logger.info.mockClear();
    const nonFunctionInspect = TaoLogger(true, {
      logger,
      verbose: true,
      inspect: 'nope',
    });
    nonFunctionInspect.handler(tao, DATA);
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);

    const nullDepth = TaoLogger(true, {
      logger,
      verbose: true,
      inspect,
      depth: null,
    });
    nullDepth.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, null);

    inspect.mockClear();
    const truthyDepth = TaoLogger(true, {
      logger,
      verbose: true,
      inspect,
      depth: 3,
    });
    truthyDepth.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, 3);
  });

  it('only falls back to identity when inspect is truly unusable, not merely when combined with a truthy depth', () => {
    const logger = { info: jest.fn() };

    // inspect is a non-null, non-function value and depth is truthy (not the
    // special-cased falsy-depth branch) - real code must still detect the
    // invalid inspect on its own and use identity rather than crash trying
    // to call `'nope'(...)`
    const invalidInspect = TaoLogger(true, {
      logger,
      verbose: true,
      inspect: 'nope',
      depth: 5,
    });

    expect(() => invalidInspect.handler(tao, DATA)).not.toThrow();
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);
  });

  it('re-evaluates the inspector every time depth() is called', () => {
    const logger = { info: jest.fn() };
    const inspect = jest.fn((value, depth) => ({ value, depth }));
    const log = TaoLogger(true, { logger, verbose: true, inspect, depth: 2 });

    log.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, 2);

    inspect.mockClear();
    log.depth(5);
    log.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, 5);

    // depth() only special-cases exactly null/undefined - 0 still uses the real inspector
    inspect.mockClear();
    log.depth(0);
    log.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, 0);

    inspect.mockClear();
    logger.info.mockClear();
    log.depth(null);
    log.handler(tao, DATA);
    expect(inspect).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);

    const noInspectLog = TaoLogger(true, { logger, verbose: true });
    noInspectLog.depth(5);
    logger.info.mockClear();
    noInspectLog.handler(tao, DATA);
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);
  });

  it('only falls back to identity from depth() when inspect is truly unusable', () => {
    const logger = { info: jest.fn() };
    const log = TaoLogger(true, { logger, verbose: true, inspect: 'nope' });

    // a non-null, non-function inspect combined with a truthy v must still
    // resolve to identity on its own merits, not because v happens to be falsy
    expect(() => {
      log.depth(5);
      log.handler(tao, DATA);
    }).not.toThrow();
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);
  });

  it('switches from the identity inspector to the real one when depth() makes it usable', () => {
    const logger = { info: jest.fn() };
    const inspect = jest.fn((value, depth) => ({ value, depth }));
    const log = TaoLogger(true, { logger, verbose: true, inspect, depth: 0 });

    log.handler(tao, DATA);
    expect(inspect).not.toHaveBeenCalled();

    log.depth(5);
    log.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, 5);
  });

  it('replaces the logger used by handler when setLogger is called', () => {
    const originalLogger = { info: jest.fn() };
    const newLogger = { info: jest.fn() };
    const log = TaoLogger(true, { logger: originalLogger });

    log.handler(tao, DATA);
    expect(originalLogger.info).toHaveBeenCalledTimes(1);

    log.setLogger(newLogger);
    log.handler(tao, DATA);
    expect(newLogger.info).toHaveBeenCalledTimes(1);
    expect(originalLogger.info).toHaveBeenCalledTimes(1);
  });

  it('re-evaluates the inspector every time setInspect() is called, honoring the current depth', () => {
    const logger = { info: jest.fn() };
    const inspect = jest.fn((value, depth) => ({ value, depth }));
    const log = TaoLogger(true, { logger, verbose: true, depth: 0 });

    // depth is 0 (not null) - setting a real inspector should engage it even at depth 0
    log.setInspect(inspect);
    log.handler(tao, DATA);
    expect(inspect).toHaveBeenCalledWith(DATA.Source, 0);

    inspect.mockClear();
    log.setInspect(null);
    logger.info.mockClear();
    log.handler(tao, DATA);
    expect(inspect).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);

    inspect.mockClear();
    log.setInspect('nope');
    logger.info.mockClear();
    log.handler(tao, DATA);
    expect(inspect).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);

    // depth null/undefined is special-cased to the identity inspector regardless of a valid inspect
    const logNullDepth = TaoLogger(true, {
      logger,
      verbose: true,
      depth: null,
    });
    logNullDepth.setInspect(inspect);
    inspect.mockClear();
    logger.info.mockClear();
    logNullDepth.handler(tao, DATA);
    expect(inspect).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Source:\n', DATA.Source);
  });
});
