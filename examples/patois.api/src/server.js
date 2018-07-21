import http from 'http';
import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import noTrailingSlash from 'koa-no-trailing-slash';
import mount from 'koa-mount';
import Router from 'koa-trie-router';
import IO from 'socket.io';
import TAO, { AppCtx } from '@tao.js/core';
import { connect } from './data/mongodb';
import * as _ from './lib/lodash-slim';
import * as spaces from './lib/models/spaces';

const { PORT } = process.env;

const connectingToMongo = connect();

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

const server = http.createServer(app.callback());
const io = IO(server);
const taoIo = io.of('/tao');

TAO.addInterceptHandler({}, (tao, data) => {
  console.log('handling tao:', tao, data);
});

TAO.addInlineHandler(
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

const saveSpaceHandler = async (tao, { Space }) => {
  let failMessage = '';
  try {
    const save = await (tao.a === 'Update'
      ? spaces.updateSpace(Space._id, Space)
      : spaces.addSpace(Space));
    if (save.success) {
      return new AppCtx('Space', 'Enter', tao.o, { Space: save.space });
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
};

TAO.addInlineHandler({ t: 'Space', a: 'Update' }, saveSpaceHandler);
TAO.addInlineHandler({ t: 'Space', a: 'Add' }, saveSpaceHandler);

taoIo.on('connection', socket => {
  console.log('connection made to `tao`');
  let lastAC = null;
  socket.on('setAC', ({ tao, data }) => {
    const datum = _.merge({}, data, {
      [tao.o]: {
        _fromSocket: true
      }
    });
    TAO.setCtx(tao, datum);
  });

  const socketHandler = (tao, data) => {
    if (!data[tao.o] || !data[tao.o]._fromSocket) {
      socket.emit('receiveAC', { tao, data });
    }
  };

  TAO.addInlineHandler({}, socketHandler);

  socket.on('disconnect', reason => {
    if (reason === 'client') {
      TAO.removeInlineHandler({}, socketHandler);
    }
  });
});

connectingToMongo.then(success => {
  if (!success) {
    console.error('Unable to connect to mongo - exiting');
    process.exit(1);
    return;
  }
  server.listen(PORT);
  console.log('LISTENING ON PORT:', PORT);
});
