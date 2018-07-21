import * as mongodb from '../../data/mongodb';

const SPACES_COLLECTION = 'spaces';

function spacesCollection() {
  return mongodb.collection(SPACES_COLLECTION);
}

export async function findSpaces() {
  const spaces = await spacesCollection()
    .find({})
    .toArray();
  return spaces;
}

export async function getSpace(id) {
  const space = await spacesCollection().findOne({ _id: mongodb.id(id) });
  return space;
}

export async function addSpace(space) {
  const inserted = await spacesCollection().insertOne(space);
  space._id = inserted.insertedId;
  return {
    success: inserted.insertedCount && inserted.insertedId,
    space
  };
}

export async function updateSpace(id, space) {
  delete space._id;
  const updated = await spacesCollection().updateOne(
    { _id: mongodb.id(id) },
    { $set: space },
    { upsert: true }
  );
  space._id = updated.upsertedId ? updated.upsertedId._id : id;
  return {
    success: !!updated.modifiedCount || !!updated.upsertedId,
    space
  };
}

export async function deleteSpace(id) {
  const deleted = await spacesCollection().deleteOne({ _id: mongodb.id(id) });
  return {
    success: !!deleted.deletedCount
  };
}
