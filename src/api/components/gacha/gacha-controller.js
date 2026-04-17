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
