const prizeRepository = require('./prize-repository');

const ensurePrizeCatalog = async (session) =>
  prizeRepository.seedInitialPrizes(session);

const getAvailablePrizes = async (session) =>
  prizeRepository.getAvailablePrizes(session);

const claimPrize = async (prizeId, session) =>
  prizeRepository.claimPrize(prizeId, session);

const getPrizeSummary = async () => prizeRepository.getPrizeSummary();

const maskName = (name) => {
  if (!name) return 'Unknown';
  return name
    .split('')
    .map((char) => {
      if (char === ' ') return ' ';
      // 50% kemungkinan setiap karakter akan menjadi bintang (kecuali spasi)
      return Math.random() < 0.5 ? '*' : char;
    })
    .join('');
};

const getMaskedWinners = async () => {
  const prizes = await prizeRepository.getPrizeSummary();
  const winners = await prizeRepository.getAllWinningGachas();

  return prizes.map((prize) => {
    const prizeWinners = winners.filter(
      (w) =>
        w.result &&
        w.result.prizeId &&
        w.result.prizeId.toString() === prize.id.toString()
    );

    return {
      prizeId: prize.id,
      prizeName: prize.name,
      winners: prizeWinners.map((w) => maskName(w.userId)),
    };
  });
};

module.exports = {
  ensurePrizeCatalog,
  getAvailablePrizes,
  claimPrize,
  getPrizeSummary,
  getMaskedWinners,
};
