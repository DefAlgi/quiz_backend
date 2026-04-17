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
