import { AppCtx, Kernel } from '@tao.js/core';
import trigramFilter from '../src/trigram-filter';
import seive from '../src/seive';
import { TaoLogger } from '../src/logger';
import { asyncBridge, inlineBridge, interceptBridge } from '../src/bridge';
import { transferError, transferToAppCtx } from '../src/transfer';
import {
  forwardAsync,
  forwardInline,
  forwardIntercept,
} from '../src/forward-chain';
import * as utils from '../src';

const SOURCE = { t: 'Source', a: 'Load', o: 'Page' };
const TARGET = { t: 'Target', a: 'Show', o: 'Page' };
const DATA = {
  Source: { id: 1 },
  Load: { pending: false },
  Page: { current: true },
};

describe('trigramFilter', () => {
  it('accepts AppCtx instances by default and rejects other values', () => {
    const filter = trigramFilter();

    expect(filter(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o))).toBe(true);
    expect(filter(SOURCE)).toBe(false);
  });

  it('matches supplied trigrams, arrays, and exact matching', () => {
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o);

    expect(trigramFilter({ t: 'Source' })(appCtx)).toBe(true);
    expect(trigramFilter([{ a: 'Load' }])(appCtx)).toBe(true);
    expect(trigramFilter(true, { t: 'Source' })(appCtx)).toBe(false);
    expect(trigramFilter(true, SOURCE)(appCtx)).toBe(true);
    expect(trigramFilter(null)(appCtx)).toBe(true);
    expect(trigramFilter(false, [SOURCE])(appCtx)).toBe(true);
    expect(trigramFilter(SOURCE)({ ...SOURCE })).toBe(false);
  });

  it('actually flattens an array of trigrams instead of matching against the array itself', () => {
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o);

    // if the array weren't flattened, `isMatch` would receive the array as
    // the trigram, whose missing t/a/o would wildcard-match anything
    expect(trigramFilter([{ t: 'NotSource' }])(appCtx)).toBe(false);
  });

  it('matches when only some (not all) of several trigrams match', () => {
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o);

    expect(trigramFilter([SOURCE, { t: 'NotSource' }])(appCtx)).toBe(true);
    expect(trigramFilter([{ t: 'NotSource' }, { t: 'AlsoNot' }])(appCtx)).toBe(
      false,
    );
  });

  it('covers shorthand filter forms and non-AppCtx inputs', () => {
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o);

    expect(trigramFilter(null)(appCtx)).toBe(true);
    expect(trigramFilter(false, SOURCE)(appCtx)).toBe(true);
    expect(trigramFilter([SOURCE])(appCtx)).toBe(true);
    expect(trigramFilter(SOURCE)({ ...SOURCE })).toBe(false);
  });
});

describe('transfer helpers', () => {
  it('transfers data to the requested trigram and transforms each datagram', () => {
    const appCtx = transferToAppCtx(SOURCE, DATA, TARGET, {
      transformTerm: (value) => ({ ...value, term: true }),
      transformAction: (value) => ({ ...value, action: true }),
      transformOrient: (value) => ({ ...value, orient: true }),
    });

    expect(appCtx.unwrapCtx()).toEqual(TARGET);
    expect(appCtx.data).toEqual({
      Target: { id: 1, term: true },
      Show: { pending: false, action: true },
      Page: { current: true, orient: true },
    });
  });

  it('uses the source trigram for omitted target fields', () => {
    const appCtx = transferToAppCtx(SOURCE, DATA, { action: 'Done' });

    expect(appCtx.unwrapCtx()).toEqual({
      t: 'Source',
      a: 'Done',
      o: 'Page',
    });
  });

  it('accepts short target trigram keys', () => {
    const appCtx = transferToAppCtx(SOURCE, DATA, {
      t: 'Target',
      a: 'Done',
      o: 'Result',
    });

    expect(appCtx.unwrapCtx()).toEqual({
      t: 'Target',
      a: 'Done',
      o: 'Result',
    });
  });

  it('falls back to source trigram fields omitted from short targets', () => {
    const appCtx = transferToAppCtx(SOURCE, DATA, {
      t: 'Target',
      o: 'Result',
    });

    expect(appCtx.unwrapCtx()).toEqual({
      t: 'Target',
      a: 'Load',
      o: 'Result',
    });
  });

  it('builds error datagrams for string, Error, and HTTP errors', () => {
    const stringError = transferError(SOURCE, DATA, 'not found');
    const error = new Error('bad response');
    error.response = { data: { status: 500 } };
    const appCtxError = transferError(SOURCE, DATA, error, {
      action: 'Error',
      transformAction: (fail) => ({ ...fail, transformed: true }),
    });

    expect(stringError.data.fail).toEqual({
      reason: 'not found',
      a: 'Load',
      Load: DATA.Load,
    });
    expect(appCtxError.unwrapCtx()).toEqual({
      t: 'Source',
      a: 'Error',
      o: 'Page',
    });
    expect(appCtxError.data.Error).toEqual(
      expect.objectContaining({
        reason: 'bad response',
        error,
        response: { status: 500 },
        transformed: true,
      }),
    );
  });
});

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

describe('bridges and seives', () => {
  it.each([
    ['inline', inlineBridge],
    ['async', asyncBridge],
    ['intercept', interceptBridge],
  ])('forwards %s handlers and detaches cleanly', (name, makeBridge) => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);

    const detach = makeBridge(source, destination, SOURCE);
    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);

    detach();
    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledTimes(1);
    expect(name).toBeDefined();
  });

  it('filters bridge forwarding and returns a noop for invalid inputs', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);

    inlineBridge(source, destination, (tao, data) => data.Source.id === 2);
    source.setCtx(SOURCE, DATA);
    expect(received).not.toHaveBeenCalled();
    source.setCtx(SOURCE, {
      ...DATA,
      Source: { id: 2 },
    });
    expect(received).toHaveBeenCalledWith(SOURCE, {
      ...DATA,
      Source: { id: 2 },
    });
    expect(() => inlineBridge({}, destination)()).not.toThrow();
    expect(() =>
      interceptBridge(source, destination, [SOURCE])(),
    ).not.toThrow();
  });

  it('bridges all signals when no filter is supplied, until detached', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);

    const detach = inlineBridge(source, destination);
    source.setCtx(SOURCE, DATA);

    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
    detach();

    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledTimes(1);
  });

  it('flattens a single array of trigrams passed as the filter argument', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);
    destination.addInlineHandler(TARGET, received);

    const detach = inlineBridge(source, destination, [SOURCE]);

    source.setCtx(TARGET, DATA);
    expect(received).not.toHaveBeenCalled();

    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);

    detach();
  });

  it('forwards AppCtx values supplied to a bridge handler', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    const appCtx = new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o, DATA);
    destination.addInlineHandler(SOURCE, received);
    inlineBridge(source, destination, SOURCE);

    const handlers = source._network._handlers.get('Source|Load|Page');
    Array.from(handlers.inlineHandlers)[0](appCtx);

    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
  });

  it('forwards matching signals through a seive and can stop it', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);

    const stop = seive(
      'test-seive',
      source,
      { _network: destination._network, _channel: destination._network },
      (ac, control) => control.allow,
      SOURCE,
    );
    // order matters here: a disallowed signal must not forward *before* an
    // allowed one does, otherwise a negation-dropping mutant that swaps which
    // of the two forwards would still leave the total call count unchanged
    source._network.setCtxControl(SOURCE, DATA, { allow: false });
    expect(received).not.toHaveBeenCalled();
    source._network.setCtxControl(SOURCE, DATA, { allow: true });
    expect(received).toHaveBeenCalledTimes(1);
    stop();
    source._network.setCtxControl(SOURCE, DATA, { allow: true });
    expect(received).toHaveBeenCalledTimes(1);
    expect(seive('bad', {}, {})()).toBeUndefined();
  });

  it('returns a no-op when source or destination are missing or invalid', () => {
    const validSource = new Kernel();
    const validDestinationShim = {
      _network: validSource._network,
      _channel: validSource._network,
    };

    expect(
      seive('missing-source', null, validDestinationShim)(),
    ).toBeUndefined();
    expect(seive('invalid-source', {}, validDestinationShim)()).toBeUndefined();
    expect(seive('missing-destination', validSource, null)()).toBeUndefined();
    expect(seive('invalid-destination', validSource, {})()).toBeUndefined();
  });

  it('merges the seive name into the forwarded control for the destination', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    let capturedControl;
    destination.addInlineHandler(SOURCE, received);
    destination._network.use((handler, ac, forwardAppCtx, control) => {
      capturedControl = control;
    });

    const stop = seive(
      'naming-seive',
      source,
      { _network: destination._network, _channel: destination._network },
      SOURCE,
    );
    source.setCtx(SOURCE, DATA);

    expect(capturedControl).toEqual(
      expect.objectContaining({ seive: 'naming-seive' }),
    );
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
    stop();
  });

  it('only forwards signals matching the given trigram filters', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);
    destination.addInlineHandler(TARGET, received);

    const stop = seive(
      'trigram-scoped',
      source,
      { _network: destination._network, _channel: destination._network },
      SOURCE,
    );

    source.setCtx(TARGET, DATA);
    expect(received).not.toHaveBeenCalled();

    source.setCtx(SOURCE, DATA);
    expect(received).toHaveBeenCalledWith(SOURCE, DATA);

    stop();
  });

  it('uses trigram-only seive filters when no predicate is supplied', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);

    const stop = seive(
      'trigram-only',
      source,
      { _network: destination._network, _channel: destination._network },
      SOURCE,
    );
    source.setCtx(SOURCE, DATA);

    expect(received).toHaveBeenCalledWith(SOURCE, DATA);
    stop();
  });
});

describe('package exports', () => {
  it('exposes every public utility', () => {
    expect(utils).toEqual(
      expect.objectContaining({
        Channel: expect.any(Function),
        Source: expect.any(Function),
        Transponder: expect.any(Function),
        Transceiver: expect.any(Function),
        TaoLogger: expect.any(Function),
        transferError: expect.any(Function),
      }),
    );
    expect(
      utils.trigramFilter(SOURCE)(new AppCtx(SOURCE.t, SOURCE.a, SOURCE.o)),
    ).toBe(true);
    expect(utils.forwardInline(new Kernel(), SOURCE, TARGET)).toEqual(
      expect.any(Function),
    );
  });
});

describe('forward-chain helpers', () => {
  it.each([
    ['inline', forwardInline],
    ['async', forwardAsync],
    ['intercept', forwardIntercept],
  ])('forwards %s handlers and exposes removal', async (name, forward) => {
    const kernel = new Kernel();
    const received = jest.fn();
    kernel.addInlineHandler(TARGET, received);
    const handler = forward(kernel, SOURCE, TARGET);

    kernel.setCtx(SOURCE, DATA);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).toHaveBeenCalledWith(TARGET, {
      Target: DATA.Source,
      Show: DATA.Load,
      Page: DATA.Page,
    });

    handler.remove();
    kernel.setCtx(SOURCE, DATA);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).toHaveBeenCalledTimes(1);
  });
});
