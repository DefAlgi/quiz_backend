Project tree:

```text

+ src
  + api
    + components
      + gacha
        - gacha-controller.js
        - gacha-repository.js
        - gacha-route.js
        - gacha-service.js
      + prize 
        - prize-controller.js
        - prize-repository.js
        - prize-route.js
        - prize-service.js
    - routes.js
  + models
    - gacha-schema.js
    - index.js
    - prize-schema.js
  - index.js
- .env.example

```

File: src/api/components/gacha/gacha-controller.js

```js
const gachaService = require('./gacha-service');

const create = async (req, res, next) => {
  try {
    const userId = (req.body && req.body.userId) || (req.user && req.user.id);

    const result = await gachaService.play({ userId });

    return res.status(200).json(result);
  } catch (error) {
    if (error && error.code === 'GACHA_DAILY_LIMIT_EXCEEDED') {
      return res.status(400).json({
        success: false,
        message: 'Kuota gacha harian habis',
      });
    }

    return next(error);
  }
};

module.exports = {
  create,
};
```

File: src/api/components/gacha/gacha-repository.js

```js
const { db, Gacha, GachaDailyUsage } = require('../../../models');

const MAX_DAILY_GACHA = 5;

const buildDailyUsageId = (userId, dayKey) => `${userId}:${dayKey}`;

const reserveDailyQuota = async ({ userId, dayKey, now }) => {
  const id = buildDailyUsageId(userId, dayKey);

  try {
    const usage = await GachaDailyUsage.findOneAndUpdate(
      {
        _id: id,
        count: { $lt: MAX_DAILY_GACHA },
      },
      {
        $setOnInsert: {
          _id: id,
          userId,
          dayKey,
          date: now,
        },
        $inc: {
          count: 1,
        },
      },
      {
        new: true,
        upsert: true,
      }
    ).lean();

    return usage;
  } catch (error) {
    if (error && error.code === 11000) {
      return null;
    }

    throw error;
  }
};

const rollbackDailyQuota = async ({ userId, dayKey }) => {
  const id = buildDailyUsageId(userId, dayKey);

  const usage = await GachaDailyUsage.findByIdAndUpdate(
    id,
    {
      $inc: {
        count: -1,
      },
    },
    {
      new: true,
    }
  ).lean();

  if (usage && usage.count <= 0) {
    await GachaDailyUsage.deleteOne({ _id: id });
  }

  return usage;
};

const saveGachaLog = async (payload, session) => {
  const [doc] = await Gacha.create([payload], { session });
  return doc;
};

const startSession = async () => db.startSession();

export {
  MAX_DAILY_GACHA,
  reserveDailyQuota,
  rollbackDailyQuota,
  saveGachaLog,
  startSession,
};
```

File: src/api/components/gacha/gacha-route.js

```js
const gachaController = require('./gacha-controller');

module.exports = (app) => {
  app.post('/gacha', gachaController.create);
  return app;
};
```

File: src/api/components/gacha/gacha-service.js

```js
const { errorResponder, errorTypes } = require('../../../core/errors');
const gachaRepository = require('./gacha-repository');
const prizeService = require('../prize/prize-service');

const TIME_ZONE = 'Asia/Jakarta';

const getDayKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const pickRandomItem = (items) =>
  items[Math.floor(Math.random() * items.length)];

const createDailyLimitError = () => {
  const error = new Error('Kuota gacha harian habis');
  error.status = 400;
  error.code = 'GACHA_DAILY_LIMIT_EXCEEDED';
  error.description = 'Bad request';
  return error;
};

const play = async ({ userId }) => {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw errorResponder(errorTypes.BAD_REQUEST, 'userId wajib diisi');
  }

  const normalizedUserId = userId.trim();
  const now = new Date();
  const dayKey = getDayKey(now);

  await prizeService.ensurePrizeCatalog();

  const usage = await gachaRepository.reserveDailyQuota({
    userId: normalizedUserId,
    dayKey,
    now,
  });

  if (!usage) {
    throw createDailyLimitError();
  }

  const session = await gachaRepository.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      const availablePrizes = await prizeService.getAvailablePrizes(session);

      const shouldWin = availablePrizes.length > 0 && Math.random() < 0.5;

      if (shouldWin) {
        const selectedPrize = pickRandomItem(availablePrizes);
        const claimedPrize = await prizeService.claimPrize(
          selectedPrize.id,
          session
        );

        if (claimedPrize) {
          result = {
            prizeId: claimedPrize.id,
            prizeName: claimedPrize.name,
          };
        }
      }

      await gachaRepository.saveGachaLog(
        {
          userId: normalizedUserId,
          playedAt: now,
          result,
        },
        session
      );
    });

    return {
      success: true,
      message: result ? 'Selamat, kamu mendapatkan hadiah' : 'Zonk',
      data: {
        userId: normalizedUserId,
        result,
      },
    };
  } catch (error) {
    await gachaRepository.rollbackDailyQuota({
      userId: normalizedUserId,
      dayKey,
    });

    throw error;
  } finally {
    session.endSession();
  }
};

export default {
  play,
};
```

File: src/api/components/prize/prize-controller.js

```js
const prizeService = require('./prize-service');

const list = async (req, res, next) => {
  try {
    const prizes = await prizeService.getPrizeSummary();

    return res.status(200).json({
      success: true,
      data: prizes.map((prize) => ({
        id: prize.id,
        code: prize.code,
        name: prize.name,
        quota: prize.quota,
        remainingQuota: prize.remainingQuota,
        winnerCount: prize.winnerCount,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  list,
};
```

File: src/api/components/prize/prize-repository.js

```js
const { Prize } = require('../../../models');

const INITIAL_PRIZES = [
  {
    code: 'emas-10g',
    name: 'Emas 10 gram',
    quota: 1,
  },
  {
    code: 'smartphone-x',
    name: 'Smartphone X',
    quota: 5,
  },
  {
    code: 'smartwatch-y',
    name: 'Smartwatch Y',
    quota: 10,
  },
  {
    code: 'voucher-100k',
    name: 'Voucher Rp100.000',
    quota: 100,
  },
  {
    code: 'pulsa-50k',
    name: 'Pulsa Rp50.000',
    quota: 500,
  },
];

const seedInitialPrizes = async (session) => {
  const operations = INITIAL_PRIZES.map((prize) =>
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
      {
        upsert: true,
        session,
      }
    )
  );

  await Promise.all(operations);
};

const getAvailablePrizes = async (session) =>
  Prize.find({ remainingQuota: { $gt: 0 } })
    .session(session)
    .sort({ quota: 1, createdAt: 1 })
    .lean();

const claimPrize = async (prizeId, session) =>
  Prize.findOneAndUpdate(
    {
      _id: prizeId,
      remainingQuota: { $gt: 0 },
    },
    {
      $inc: {
        remainingQuota: -1,
        winnerCount: 1,
      },
    },
    {
      new: true,
      session,
    }
  ).lean();

const getPrizeSummary = async () =>
  Prize.find({}).sort({ createdAt: 1 }).lean();

module.exports = {
  INITIAL_PRIZES,
  seedInitialPrizes,
  getAvailablePrizes,
  claimPrize,
  getPrizeSummary,
};
```

File: src/api/components/prize/prize-route.js

```js
const prizeController = require('./prize-controller');

module.exports = (app) => {
  app.get('/prizes', prizeController.list);
  return app;
};
```

File: src/api/components/prize/prize-service.js

```js
const prizeRepository = require('./prize-repository');

const ensurePrizeCatalog = async (session) =>
  prizeRepository.seedInitialPrizes(session);

const getAvailablePrizes = async (session) =>
  prizeRepository.getAvailablePrizes(session);

const claimPrize = async (prizeId, session) =>
  prizeRepository.claimPrize(prizeId, session);

const getPrizeSummary = async () => prizeRepository.getPrizeSummary();

module.exports = {
  ensurePrizeCatalog,
  getAvailablePrizes,
  claimPrize,
  getPrizeSummary,
};
```

File: src/api/routes.js

```js
const express = require('express');

const gacha = require('./components/gacha/gacha-route');
const prize = require('./components/prize/prize-route');

module.exports = () => {
  const app = express.Router();

  gacha(app);
  prize(app);

  return app;
};
```

File: src/index.js

```js
const { env, port } = require('./core/config');
const logger = require('./core/logger')('app');
const server = require('./core/server');

const app = server.listen(port, (err) => {
  if (err) {
    logger.fatal(err, 'Failed to start the server.');
    process.exit(1);
  } else {
    logger.info(`Server runs at port ${port} in ${env} environment`);
  }
});

process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught exception.');

  // Shutdown the server gracefully
  app.close(() => process.exit(1));

  // If a graceful shutdown is not achieved after 1 second,
  // shut down the process completely
  setTimeout(() => process.abort(), 1000).unref();
  process.exit(1);
});
```

File: src/models/gacha-schema.js

```js
module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const GachaResultSchema = new Schema(
    {
      prizeId: {
        type: Schema.Types.ObjectId,
        ref: 'Prize',
        default: null,
      },
      prizeName: {
        type: String,
        default: null,
      },
    },
    { _id: false }
  );

  const GachaSchema = new Schema(
    {
      userId: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },
      playedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },
      result: {
        type: GachaResultSchema,
        default: null,
      },
    },
    {
      timestamps: true,
      collection: 'gacha_logs',
    }
  );

  GachaSchema.index({ userId: 1, playedAt: -1 });

  return mongoose.model('Gacha', GachaSchema);
};
```

File: src/models/index.js

```js
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
```

File: src/models/prize-schema.js

```js
module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const PrizeSchema = new Schema(
    {
      code: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      quota: {
        type: Number,
        required: true,
        min: 0,
      },
      remainingQuota: {
        type: Number,
        required: true,
        min: 0,
      },
      winnerCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
      collection: 'prizes',
    }
  );

  PrizeSchema.index({ code: 1 }, { unique: true });

  return mongoose.model('Prize', PrizeSchema);
};
```

File: .env.example

```
# Default application port
PORT=5000

# Database configuration
DB_CONNECTION=mongodb://127.0.0.1:27017
DB_NAME=demo-db

```

Always output in same format as provided. Only provide new or files that requires update
