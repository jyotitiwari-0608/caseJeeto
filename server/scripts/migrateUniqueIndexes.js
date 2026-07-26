require('dotenv').config();
const mongoose = require('mongoose');

async function duplicateGroups(collection, keys, match = {}) {
  const id = Object.fromEntries(keys.map((key) => [key, `$${key}`]));
  return collection.aggregate([
    { $match: match },
    { $group: { _id: id, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]).toArray();
}

function sameValue(left, right) {
  return JSON.stringify(left || null) === JSON.stringify(right || null);
}

async function collectionExists(db, name) {
  return db.listCollections({ name }, { nameOnly: true }).hasNext();
}

async function ensureUniqueIndex(db, collectionName, key, options) {
  if (!(await collectionExists(db, collectionName))) {
    await db.createCollection(collectionName);
  }
  const collection = db.collection(collectionName);
  const indexes = await collection.listIndexes().toArray();
  const sameKey = indexes.find((index) => JSON.stringify(index.key) === JSON.stringify(key));
  const correct = sameKey?.unique &&
    sameValue(sameKey.partialFilterExpression, options.partialFilterExpression) &&
    Boolean(sameKey.sparse) === Boolean(options.sparse);
  if (correct) return;

  // MongoDB 5+ can build the replacement alongside the old index, avoiding
  // an unenforced write window. Older versions/options conflicts require an
  // explicit application write freeze before drop-and-create fallback.
  const temporaryName = `${options.name}__unique_migration`;
  try {
    await collection.createIndex(key, { ...options, name: temporaryName });
    if (sameKey) await collection.dropIndex(sameKey.name);
  } catch (err) {
    if (![85, 86].includes(err?.code) || process.env.INDEX_MIGRATION_WRITE_FREEZE !== 'true') {
      throw new Error(
        `Cannot safely replace ${collectionName}.${options.name}. ` +
        'Stop application writes, set INDEX_MIGRATION_WRITE_FREEZE=true, and rerun.'
      );
    }
    if (sameKey) await collection.dropIndex(sameKey.name);
    await collection.createIndex(key, options);
  }

  const verified = (await collection.listIndexes().toArray()).find(
    (index) => JSON.stringify(index.key) === JSON.stringify(key) && index.unique &&
      sameValue(index.partialFilterExpression, options.partialFilterExpression) &&
      Boolean(index.sparse) === Boolean(options.sparse)
  );
  if (!verified) throw new Error(`Index verification failed for ${collectionName}.${options.name}.`);
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  const checks = [
    ['payments', ['bookingId'], { bookingId: { $exists: true } }],
    ['payments', ['razorpayOrderId'], { razorpayOrderId: { $type: 'string' } }],
    ['payments', ['razorpayPaymentId'], { razorpayPaymentId: { $type: 'string' } }],
    ['refunds', ['paymentId'], { paymentId: { $exists: true } }],
    ['conversations', ['clientId', 'lawyerId'], {}],
  ];

  const failures = [];
  for (const [collectionName, keys, match] of checks) {
    if (!(await collectionExists(db, collectionName))) continue;
    const duplicates = await duplicateGroups(db.collection(collectionName), keys, match);
    if (duplicates.length) failures.push({ collectionName, keys, duplicates });
  }
  if (failures.length) {
    console.error(JSON.stringify({ message: 'Duplicate cleanup required before index migration.', failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  await ensureUniqueIndex(db, 'payments', { bookingId: 1 }, { unique: true, name: 'bookingId_1' });
  await ensureUniqueIndex(db, 'payments',
    { razorpayOrderId: 1 },
    { unique: true, name: 'razorpayOrderId_1', partialFilterExpression: { razorpayOrderId: { $type: 'string' } } }
  );
  await ensureUniqueIndex(db, 'payments',
    { razorpayPaymentId: 1 },
    { unique: true, name: 'razorpayPaymentId_1', partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } }
  );
  await ensureUniqueIndex(db, 'refunds', { paymentId: 1 }, { unique: true, name: 'paymentId_1' });
  await ensureUniqueIndex(db, 'conversations',
    { clientId: 1, lawyerId: 1 },
    { unique: true, name: 'clientId_1_lawyerId_1' }
  );
  console.log('Unique indexes verified and created.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
