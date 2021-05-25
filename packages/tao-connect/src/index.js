import TAO, { AppCtx } from '@tao.js/core';
import { Channel } from '@tao.js/utils';

function NOOP() {}
function IDENTITY(val) {
  return () => val;
}

function ConnectWrapper(app, network = TAO) {
  app.use(TaoMiddleware(network));

  function mapper(route, trigram, data = NOOP) {
    app.get(route, (req, res, next) => {
      if (typeof trigram === 'function') {
        const ac = trigram(req);
      } else {
        const acData = data(req);
      }
    });
  }
  return {};
}

export function TaoMiddleware(network = TAO) {
  return (req, res, next) => {
    const channel = new Channel(network);
    req.channel = channel;
    next();
  };
}

export function TaoMapHandler({ trigram, dataFn = NOOP, network = TAO }) {
  const handlerChannel = new Channel(network);
  trigram = typeof trigram === 'function' ? trigram : IDENTITY(trigram);

  const middleware = () => (req, res, next) => {
    const channel = handlerChannel.clone();
    const acData = dataFn(req);
    const ac = trigram(req, acData);
    if (ac instanceof AppCtx) {
      channel.setAppCtx(ac);
    } else {
      channel.setCtx(ac, acData);
    }
  };

  // TODO: finish whatever this is
  const responseHandler = null; // (trigram, (res, x)) => {};
  return {
    middleware,
    responseHandler
  };
}

// TODO: finish whatever this is
const app = {}; // express();
const handler = () => {}; // TaoMapHandler({
//   trigram: { t: 'user', a: 'find', o: 'admin' },
//   setter: (req, trigram) => ({})
//   // handlersFor: [],
//   // handle: ()
// })
//   .signal(req => {})
//   .respondOn(trigram)
//   .responder((tao, data, res, next));
app.get('/users', handler());
