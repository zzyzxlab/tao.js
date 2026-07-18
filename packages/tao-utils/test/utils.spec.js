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

  it('bridges all signals when no filter is supplied', () => {
    const source = new Kernel();
    const destination = new Kernel();
    const received = jest.fn();
    destination.addInlineHandler(SOURCE, received);

    const detach = inlineBridge(source, destination);
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
    source._network.setCtxControl(SOURCE, DATA, { allow: false });
    source._network.setCtxControl(SOURCE, DATA, { allow: true });
    expect(received).toHaveBeenCalledTimes(1);
    stop();
    source._network.setCtxControl(SOURCE, DATA, { allow: true });
    expect(received).toHaveBeenCalledTimes(1);
    expect(seive('bad', {}, {})()).toBeUndefined();
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
