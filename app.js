'use strict';

module.exports = app => {
  const MongoStore = require('./lib/session')(app);
  const options = app.config.sessionMongo;

  app.beforeStart(async () => {
    app.sessionStore = new MongoStore(options);
  });
};
