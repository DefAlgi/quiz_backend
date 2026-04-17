const gachaController = require('./gacha-controller');

module.exports = (app) => {
  app.post('/gacha', gachaController.create);
  app.get('/gacha/history', gachaController.getHistory);

  return app;
};
