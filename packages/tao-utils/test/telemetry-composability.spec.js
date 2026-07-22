import { AppCtx, Kernel } from '@tao.js/core';
import { Tracer, InMemorySink } from '@tao.js/telemetry';
import Channel from '../src/Channel';
import Transponder from '../src/Transponder';

const TERM = 'trace';
const ACTION = 'test';
const ORIENT = 'jest';
const NEXT_ACTION = 'chained';
const THIRD_ACTION = 'settled';

const TRIGRAM = { t: TERM, a: ACTION, o: ORIENT };
const NEXT_TRIGRAM = { t: TERM, a: NEXT_ACTION, o: ORIENT };

let TAO = null;
let sink = null;
beforeEach(() => {
  TAO = new Kernel();
  sink = new InMemorySink();
});
afterEach(() => {
  TAO = null;
  sink = null;
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Tracer composes with Channel — full fidelity without instrumentation', () => {
  it('should record channel cascades as one linked tree while channel filtering works', async () => {
    // Assemble
    new Tracer(TAO, { sinks: [sink] });
    const channel = new Channel(TAO, 'traced-channel');
    const other = new Channel(TAO, 'other-channel');
    const mirrored = jest.fn();
    const leaked = jest.fn();
    channel.addInlineHandler(NEXT_TRIGRAM, mirrored);
    other.addInlineHandler(NEXT_TRIGRAM, leaked);
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    TAO.addInlineHandler(
      NEXT_TRIGRAM,
      () => new AppCtx(TERM, THIRD_ACTION, ORIENT),
    );
    // Act
    channel.setCtx(TRIGRAM, {});
    await flush();
    // Assert — behavior: this channel's handlers saw the chain, no leaks
    expect(mirrored).toHaveBeenCalledTimes(1);
    expect(leaked).not.toHaveBeenCalled();
    // Assert — tracing: one tree, each signal recorded exactly once
    expect(sink.size).toBe(3);
    const [root, child, grandchild] = sink.records;
    expect(child.parentId).toBe(root.signalId);
    expect(grandchild.parentId).toBe(child.signalId);
    expect(grandchild.traceId).toBe(root.traceId);
  });

  it('should trace transponder-entered cascades with full linkage', async () => {
    // Assemble
    new Tracer(TAO, { sinks: [sink] });
    const transponder = new Transponder(TAO, 'traced-transponder', 0);
    TAO.addInlineHandler(TRIGRAM, () => new AppCtx(TERM, NEXT_ACTION, ORIENT));
    // Act
    const settled = await transponder.setCtx(TRIGRAM, {});
    await flush();
    // Assert
    expect(settled).toBeInstanceOf(AppCtx);
    expect(sink.size).toBe(2);
    const [root, child] = sink.records;
    expect(child.parentId).toBe(root.signalId);
  });
});
