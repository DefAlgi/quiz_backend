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

module.exports = {
  MAX_DAILY_GACHA,
  reserveDailyQuota,
  rollbackDailyQuota,
  saveGachaLog,
  startSession,
};

const getUserHistory = async (userId) =>
  Gacha.find({ userId })

    .sort({ playedAt: -1 })
    .lean();

module.exports = {
  getUserHistory,
};
