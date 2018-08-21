import Redis from 'ioredis';

const TYPE_RE = /{type}/gi;
const ID_RE = /{id}/gi;

const {
  REDIS_HOST = 'localhost',
  REDIS_PORT = 6379,
  REDIS_DB = 0,
  REDIS_KEYSPACE = 'patois:api:',
  REDIS_CACHE_KEY_PATTERN = '{type}:{id}'
} = process.env;

const defaultConfig = {
  host: REDIS_HOST,
  port: +REDIS_PORT,
  db: +REDIS_DB
};

let redis = null;
let CACHE_KEY_PATTERN = '';

export function init({ host, port, db, keySpace = '', keyPattern = '' } = {}) {
  const keyPrefix = keySpace || REDIS_KEYSPACE;
  const config = {
    ...defaultConfig,
    ...{
      host,
      port,
      db,
      keyPrefix
    }
  };
  CACHE_KEY_PATTERN = keyPattern || REDIS_CACHE_KEY_PATTERN;
  redis = new Redis({
    host: config.host,
    port: config.port,
    db: config.db,
    keyPrefix
  });
}

export const close = () => {
  if (redis) {
    redis.disconnect();
  }
};

function convertTypeToKey(type, id) {
  return CACHE_KEY_PATTERN.replace(TYPE_RE, type).replace(ID_RE, id);
}

export async function getItem(type, id) {
  const itemKey = convertTypeToKey(type, id);
  return await redis.hgetall(itemKey);
}

export async function setItem(type, id, item) {
  const itemKey = convertTypeToKey(type, id);
  return await redis.hmset(itemKey, item);
}
