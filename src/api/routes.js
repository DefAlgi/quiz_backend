const express = require('express');

const gacha = require('./components/gacha/gacha-route');
const prize = require('./components/prize/prize-route');

module.exports = () => {
  const app = express.Router();

  gacha(app);
  prize(app);

  return app;
};
