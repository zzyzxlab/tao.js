import TAO, {
  AppCtx,
  Kernel,
  Network,
  INTERCEPT,
  ASYNC,
  INLINE,
} from '@tao.js/core';
import type {
  Trigram,
  Handler,
  Envelope,
  Forward,
  DecorationSpec,
} from '@tao.js/core';
import type { AssertFalse, IsAny } from './helpers';

type _kernel = AssertFalse<IsAny<Kernel>>;
type _trigram = AssertFalse<IsAny<Trigram>>;
type _handler = AssertFalse<IsAny<Handler>>;
type _envelope = AssertFalse<IsAny<Envelope>>;
type _forward = AssertFalse<IsAny<Forward>>;
type _decorationSpec = AssertFalse<IsAny<DecorationSpec>>;

const kernel = new Kernel();
const wildKernel = new Kernel(true);

const trigram: Trigram = { t: 'User', a: 'Find', o: 'Portal' };
const longTrigram: Trigram = { term: 'User', action: 'Find', orient: 'Portal' };

const handler: Handler = (tao, data) =>
  new AppCtx('User', 'View', 'Portal', { User: data.User });

kernel.addInlineHandler(trigram, handler);
kernel.addAsyncHandler({ a: 'Find' }, () => undefined);
kernel.addInterceptHandler(longTrigram, () => true);
kernel.setCtx({ t: 'User', a: 'Find', o: 'Portal' }, { User: { id: '1' } });
kernel.setAppCtx(new AppCtx('User', 'Find', 'Portal', { User: { id: '42' } }));
kernel.removeInlineHandler(trigram, handler);
kernel.removeAsyncHandler({ a: 'Find' }, handler);
kernel.removeInterceptHandler(longTrigram, handler);
const clone: Kernel = kernel.clone(true);
clone.setCtx({ t: 'App', a: 'Enter', o: 'Portal' });
TAO.setCtx({ t: 'App', a: 'Enter', o: 'Portal' });

const ac = new AppCtx('User', 'Find', 'Portal', { User: { id: '42' } });
const key: string = ac.key;
const term: string = ac.t;
const unwrapped = ac.unwrapCtx();
type _unwrapped = AssertFalse<IsAny<typeof unwrapped>>;

const network = new Network(true);
const spec: DecorationSpec = {
  name: 'consumer',
  onDispatch: (dispatchedAc, envelope) => {
    const e: Envelope = envelope;
    void e;
    void dispatchedAc;
  },
};
const undecorate = network.decorate(spec);
network.enter(new AppCtx('User', 'Find', 'Portal'));
undecorate();

const phases: string[] = [INTERCEPT, ASYNC, INLINE];
void phases;
void wildKernel;
void key;
void term;
