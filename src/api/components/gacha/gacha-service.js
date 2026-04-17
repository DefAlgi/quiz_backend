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
        // PERBAIKAN: Gunakan ._id alih-alih .id karena kita menggunakan .lean() di repository
        const claimedPrize = await prizeService.claimPrize(
          selectedPrize.id,
          session
        );

        if (claimedPrize) {
          result = {
            // PERBAIKAN: Gunakan ._id
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

module.exports = {
  play,
};
