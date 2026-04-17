const gachaController = require('./gacha-controller');

module.exports = (app) => {
  app.post('/gacha', gachaController.create);
  return app;
};
