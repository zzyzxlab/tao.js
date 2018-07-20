import { MongoClient, ObjectID } from 'mongodb';

const log = console;

const { MONGO_URL, MONGO_DB } = process.env;

let client = null;
let connectedDb = null;

export async function connect() {
  if (client && connectedDb) {
    return true;
  }

  try {
    if (!client || !client.isConnected()) {
      client = await MongoClient.connect(MONGO_URL);
    }
    connectedDb = client.db(MONGO_DB);
    return true;
  } catch (err) {
    log.error('ERROR connecting to Mongodb:', err);
    return false;
  }
}

export function collection(name) {
  if (!connectedDb || !client.isConnected()) {
    return;
  }
  return connectedDb.collection(name);
}

export function id(id) {
  return new ObjectID(id);
}

export async function close() {
  if (client && client.isConnected()) {
    connectedDb = null;
    await client.close();
  }
}
