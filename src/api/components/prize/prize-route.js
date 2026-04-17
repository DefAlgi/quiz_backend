const prizeController = require('./prize-controller');

module.exports = (app) => {
  app.get('/prizes', prizeController.list);
  app.get('/prizes/winners', prizeController.getWinnersList);

  return app;
};
