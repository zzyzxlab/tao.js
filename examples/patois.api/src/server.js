import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import noTrailingSlash from 'koa-no-trailing-slash';
import mount from 'koa-mount';
import Router from 'koa-trie-router';
import * as mongodb from './data/mongodb';

const { PORT } = process.env;
const SPACES_COLLECTION = 'spaces';

const connectingToMongo = mongodb.connect();

const app = new Koa();
app.use(cors());
app.use(bodyParser());
app.use(noTrailingSlash());

const restRouter = new Router();

restRouter.get('/spaces', async (ctx, next) => {
  const spacesCol = mongodb.collection(SPACES_COLLECTION);
  const spaces = await spacesCol.find({}).toArray();
  ctx.response.body = spaces;
  await next();
});

restRouter.get('/spaces/:id', async (ctx, next) => {
  const spacesCol = mongodb.collection(SPACES_COLLECTION);
  const space = await spacesCol.findOne({ _id: mongodb.id(ctx.params.id) });
  ctx.response.body = space;
  await next();
});

restRouter.post('/spaces', async (ctx, next) => {
  const spacesCol = mongodb.collection(SPACES_COLLECTION);
  const space = ctx.request.body;
  const inserted = await spacesCol.insertOne(space);
  if (!inserted.insertedCount || !inserted.insertedId) {
    ctx.response.status = 304;
  } else {
    ctx.response.status = 201;
  }
  space._id = inserted.insertedId;
  ctx.response.body = space;
  await next();
});

restRouter.put('/spaces/:id', async (ctx, next) => {
  const spacesCol = mongodb.collection(SPACES_COLLECTION);
  const space = ctx.request.body;
  const id = ctx.params.id;
  delete space._id;
  const updated = await spacesCol.updateOne(
    { _id: mongodb.id(id) },
    { $set: space },
    { upsert: true }
  );
  space._id = updated.upsertedId ? updated.upsertedId._id : id;
  if (!updated.modifiedCount && !updated.upsertedId) {
    ctx.response.status = 304;
  }
  ctx.response.body = space;
  await next();
});

restRouter.del('/spaces/:id', async (ctx, next) => {
  const spacesCol = mongodb.collection(SPACES_COLLECTION);
  const id = ctx.params.id;
  const deleted = await spacesCol.deleteOne({ _id: mongodb.id(id) });
  if (deleted.deletedCount) {
    ctx.response.status = 204;
  } else {
    ctx.response.status = 410;
  }
  await next();
});

app.use(mount('/api', restRouter.middleware()));

connectingToMongo.then(success => {
  if (!success) {
    console.error('Unable to connect to mongo - exiting');
    process.exit(1);
    return;
  }
  app.listen(PORT);
  console.log('LISTENING ON PORT:', PORT);
});
