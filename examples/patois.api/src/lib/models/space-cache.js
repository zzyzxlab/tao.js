import * as redis from '../../data/redis';

const SPACES_CACHE_TYPE = 'spaces';

export async function setSpace(space) {
  return await redis.setItem(SPACES_CACHE_TYPE, space._id, space);
}

export async function retrieveSpace(id) {
  const space = await redis.getItem(SPACES_CACHE_TYPE, id);
  return space;
}
