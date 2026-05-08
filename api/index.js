const app = require('../backend/src/index.js');
module.exports = (req, res) => {
  // Simple proxy to our express app
  return app(req, res);
};
