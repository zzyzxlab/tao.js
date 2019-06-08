import http from 'http';
import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import noTrailingSlash from 'koa-no-trailing-slash';
import mount from 'koa-mount';
import Router from 'koa-trie-router';
import IO from 'socket.io';
import TAO, { AppCtx } from '@tao.js/core';
import wireTaoJsToSocketIO from '@tao.js/socket.io';
import * as utils from '@tao.js/utils';
import { connect } from './data/mongodb';
import * as redis from './data/redis';
// import { init } from './data/redis';
import * as spaces from './lib/models/spaces';
import * as spaceCache from './lib/models/space-cache';
import { toASCII } from 'punycode';
// import taoKoa from '@tao.js/koa';

const { PORT } = process.env;

const connectingToMongo = connect();
const connectingToRedis = redis.init();

const app = new Koa();
app.use(cors());
app.use(bodyParser());
app.use(noTrailingSlash());

const restRouter = new Router();

restRouter.get('/spaces', async (ctx, next) => {
  ctx.response.body = await spaces.findSpaces();
  await next();
});

restRouter.get('/spaces/:id', async (ctx, next) => {
  ctx.response.body = await spaces.getSpace(ctx.params.id);
  await next();
});

restRouter.post('/spaces', async (ctx, next) => {
  const space = ctx.request.body;
  const result = await spaces.addSpace(space);
  if (!result.success) {
    ctx.response.status = 304;
  } else {
    ctx.response.status = 201;
  }
  ctx.response.body = result.space;
  await next();
});

restRouter.put('/spaces/:id', async (ctx, next) => {
  const id = ctx.params.id;
  const space = ctx.request.body;
  const result = await spaces.updateSpace(id, space);
  if (!result.success) {
    ctx.response.status = 304;
  }
  ctx.response.body = result.space;
  await next();
});

restRouter.del('/spaces/:id', async (ctx, next) => {
  const id = ctx.params.id;
  const result = await spaces.deleteSpace(id);
  if (result.success) {
    ctx.response.status = 204;
  } else {
    ctx.response.status = 410;
  }
  await next();
});

app.use(mount('/api', restRouter.middleware()));

TAO.addInterceptHandler({}, (tao, data) => {
  console.log('handling tao:', tao, data);
});

TAO.addAsyncHandler({ a: 'Stored' }, async (tao, data) => {
  const id = data[tao.t]._id;
  await redis.setItem(tao.t, id, data[tao.t]);
});

const spaceCounters = {};

TAO.addAsyncHandler({ t: 'Space', a: 'Enter', o: 'Portal' }, (tao, data) => {
  return new AppCtx('Space', 'Enter', 'Track', data);
}).addInlineHandler({ t: 'Space', a: 'Enter', o: 'Track' }, (tao, data) => {
  const { Space } = data;
  if (!Space || !Space._id) {
    return;
  }
  if (!spaceCounters[Space._id]) {
    spaceCounters[Space._id] = 0;
  }
  spaceCounters[Space._id]++;
  return new AppCtx(
    'Space',
    'Tracked',
    'Portal',
    { _id: Space._id },
    spaceCounters[Space._id]
  );
});

// taoKoa.path({
//   incoming: { t: 'Space', a: 'Find', o: 'Portal' },
//   outgoing: { t: 'Space', a: ['List', 'Enter', 'Fail'], o: 'Portal' },
// });

// taoKoa.path({
//   incoming: { t: 'Space', a: ['Update', 'Add'], o: 'Portal' },
//   outgoing: { t: 'Space', a: ['List', 'Enter', 'Fail'], o: 'Portal' },
// });

function initClientTAO(clientTAO, id) {
  clientTAO.addInterceptHandler({}, (tao, data) => {
    console.log(`clientTAO[${id}].handling:`, tao);
  });

  clientTAO.addInlineHandler(
    { t: 'Space', a: 'Find', o: 'Portal' },
    async (tao, { Find }) => {
      try {
        const data = await (!Find || !Find._id
          ? spaces.findSpaces()
          : spaces.getSpace(Find._id));
        return new AppCtx(
          'Space',
          Array.isArray(data) ? 'List' : 'Enter',
          tao.o,
          {
            Space: data
          }
        );
      } catch (apiErr) {
        console.error('Failed to retrieve Space:', apiErr);
        return new AppCtx('Space', 'Fail', tao.o, {
          Fail: {
            on: tao.a,
            message: apiErr.message,
            Find
          }
        });
      }
    }
  );

  clientTAO.addInterceptHandler(
    { t: 'Space', a: 'Find', o: 'Portal' },
    async (tao, data) => {
      if (!data.Find || !data.Find._id) {
        // don't check cache
        return;
      }
      const Space = await redis.getItem(tao.t, data.Find._id);
      if (!Space || !Space._id) {
        // cache miss
        console.log('CACHE MISS! on:', data.Find._id);
        return;
      }
      // use the cache hit to go to the next AppCtx in the protocol chain
      console.log('CACHE HIT on:', Space._id);
      return new AppCtx('Space', 'Enter', 'Portal', Space);
    }
  );

  clientTAO.addInlineHandler({ t: 'Space', a: 'Update' }, saveSpaceHandler);
  clientTAO.addInlineHandler({ t: 'Space', a: 'Add' }, saveSpaceHandler);
  clientTAO.addInlineHandler({ t: 'Space', a: 'Stored' }, (tao, data) => {
    return new AppCtx('Space', 'Enter', tao.o, { Space: data.Space });
  });

  const bridgeToGlobal = utils.inlineBridge(
    clientTAO,
    TAO,
    { t: 'Space', a: 'Stored' },
    { t: 'Space', a: 'Enter' }
  );

  const bridgeToClient = utils.inlineBridge(TAO, clientTAO, {
    t: 'Space',
    a: 'Tracked',
    o: 'Portal'
  });

  // const forwardSpaceTracked = (tao, data) => {
  //   clientTAO.setCtx(tao, data);
  // };

  // // forward the AppCon to the client
  // TAO.addInlineHandler(
  //   { t: 'Space', a: 'Tracked', o: 'Portal' },
  //   forwardSpaceTracked
  // );

  return () => {
    console.log('disconnected client - removing TAO handler');
    bridgeToClient();
    bridgeToGlobal();
    // TAO.removeInlineHandler(
    //   { t: 'Space', a: 'Tracked', o: 'Portal' },
    //   forwardSpaceTracked
    // );
  };
}

async function saveSpaceHandler(tao, { Space }) {
  let failMessage = '';
  try {
    const save = await (tao.a === 'Update'
      ? spaces.updateSpace(Space._id, Space)
      : spaces.addSpace(Space));
    if (save.success) {
      // return new AppCtx('Space', 'Enter', tao.o, { Space: save.space });
      const ac = new AppCtx('Space', 'Stored', tao.o, { Space: save.space });
      // TAO.setAppCtx(ac);
      return ac;
    }
    failMessage = 'Not Successful';
  } catch (apiErr) {
    failMessage = apiErr.message;
  }
  return new AppCtx('Space', 'Fail', tao.o, {
    Space,
    Fail: {
      on: tao.a,
      message: failMessage
    }
  });
}

const server = http.createServer(app.callback());
const io = IO(server);
wireTaoJsToSocketIO(TAO, io, {
  onConnect: initClientTAO
});

connectingToMongo
  .then(success => {
    if (!success) {
      console.error('Unable to connect to mongo - exiting');
      process.exit(1);
      return;
    }
    console.info('connected to mongodb');
    return connectingToRedis;
  })
  .then(() => {
    console.info('connected to redis');
    server.listen(PORT);
    console.log('LISTENING ON PORT:', PORT);
  })
  .catch(err => {
    console.error('Error trying to set up', err);
    process.exit(1);
  });
