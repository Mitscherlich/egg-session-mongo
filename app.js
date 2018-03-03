'use strict';

module.exports = app => {
  app.sessionStore = require('./lib/session')(app);
};
