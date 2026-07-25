import { Kernel } from '@tao.js/core';
import {
  Channel,
  Source,
  Transponder,
  Transceiver,
  trigramFilter,
  seive,
  createTransport,
  enterFromWire,
  wireEnvelope,
  forwardInline,
  forwardAsync,
  forwardIntercept,
} from '@tao.js/utils';
import type { WireEnvelope, NetworkSurface } from '@tao.js/utils';
import type { AssertFalse, IsAny } from './helpers';

type _wireEnvelope = AssertFalse<IsAny<WireEnvelope>>;
type _networkSurface = AssertFalse<IsAny<NetworkSurface>>;
type _channel = AssertFalse<IsAny<Channel>>;
type _transponder = AssertFalse<IsAny<Transponder>>;

const kernel = new Kernel();

const channel = new Channel(kernel, 'chan-1');
channel.setCtx({ t: 'User', a: 'Find', o: 'Portal' }, { User: {} });
const clonedChannel: Channel = channel.clone('chan-2');
void clonedChannel;

const transponder = new Transponder(kernel, undefined, 3000);
const settled = transponder.setCtx(
  { t: 'User', a: 'Find', o: 'Portal' },
  { User: { id: '1' } },
);
type _settled = AssertFalse<IsAny<typeof settled>>;

const transceiver = new Transceiver(kernel);
void transceiver;

const source = new Source(
  kernel,
  (tao, data) => {
    void tao;
    void data;
  },
  'SRC',
  (setter) => {
    setter({ t: 'User', a: 'Find', o: 'Portal' }, { User: {} });
  },
);
void source;

const transport = createTransport(kernel, {
  name: 'wire1',
  send: (tao, data, wire) => {
    const w: WireEnvelope = wire;
    void w;
    void tao;
    void data;
  },
});
transport.receive({ t: 'User', a: 'Find', o: 'Portal' }, {}, undefined);
transport.dispose();

enterFromWire(
  kernel,
  { t: 'User', a: 'Find', o: 'Portal' },
  {},
  undefined,
  'WIRE9',
);
type _wireEnvelopeFn = AssertFalse<IsAny<typeof wireEnvelope>>;
type _trigramFilter = AssertFalse<IsAny<typeof trigramFilter>>;
type _seive = AssertFalse<IsAny<typeof seive>>;

const fwd = forwardInline(
  kernel,
  { t: 'User', a: 'Found', o: 'Portal' },
  { t: 'User', a: 'View', o: 'Portal' },
);
fwd.remove();
type _forwardAsync = AssertFalse<IsAny<typeof forwardAsync>>;
type _forwardIntercept = AssertFalse<IsAny<typeof forwardIntercept>>;
