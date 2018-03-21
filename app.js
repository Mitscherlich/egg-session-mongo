'use strict';

module.exports = app => {
  const MongoStore = require('koa-session-mongo');
  const options = app.config.sessionMongo;

  app.beforeStart(async () => {
    app.sessionStore = new MongoStore(options);
  });
};
