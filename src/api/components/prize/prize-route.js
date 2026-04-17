const prizeController = require('./prize-controller');

module.exports = (app) => {
  app.get('/prizes', prizeController.list);
  return app;
};
