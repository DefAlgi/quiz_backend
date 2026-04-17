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
