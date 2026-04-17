const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const config = require('../core/config');
const logger = require('../core/logger')('app');

// Join the database connection string
const connectionString = new URL(config.database.connection);
connectionString.pathname += config.database.name;

mongoose.connect(`${connectionString.toString()}`);

const dbExports = {};

const db = mongoose.connection;
dbExports.db = db;

db.once('open', async () => {
  logger.info('Successfully connected to MongoDB');

  // ================== SEED PRIZE ==================
  try {
    const { Prize } = dbExports;

    if (!Prize) {
      logger.warn('Prize model not found, skip seeding');
      return;
    }

    const INITIAL_PRIZES = [
      { code: 'emas-10g', name: 'Emas 10 gram', quota: 1 },
      { code: 'smartphone-x', name: 'Smartphone X', quota: 5 },
      { code: 'smartwatch-y', name: 'Smartwatch Y', quota: 10 },
      { code: 'voucher-100k', name: 'Voucher Rp100.000', quota: 100 },
      { code: 'pulsa-50k', name: 'Pulsa Rp50.000', quota: 500 },
    ];

    await Promise.all(
      INITIAL_PRIZES.map((prize) =>
        Prize.updateOne(
          { code: prize.code },
          {
            $setOnInsert: {
              code: prize.code,
              name: prize.name,
              quota: prize.quota,
              remainingQuota: prize.quota,
              winnerCount: 0,
            },
          },
          { upsert: true }
        )
      )
    );

    logger.info('Prize seeding completed');
  } catch (err) {
    logger.error(err, 'Prize seeding failed');
  }
});

const basename = path.basename(__filename);

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  )
  .forEach((file) => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const model = require(path.join(__dirname, file))(mongoose);
    dbExports[model.modelName] = model;
  });

module.exports = dbExports;
