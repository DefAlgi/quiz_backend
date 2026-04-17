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
