const gachaController = require('./gacha-controller');

module.exports = (app) => {
  app.post('/gacha', gachaController.create);
  return app;
};

module.exports = (app) => {
  app.post('/gacha', gachaController.create);

  // NEW
  app.get('/gacha/history', gachaController.getHistory);

  return app;
};
