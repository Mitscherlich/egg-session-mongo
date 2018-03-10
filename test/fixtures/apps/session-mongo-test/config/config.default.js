'use strict';

exports.sessionMongo = {
  url: 'mongodb://127.0.0.1/test',
  db: 'test',
  collection: 'sessions',
  mongooseConnection: null, // uncomment this to re-use existing or upcoming mongoose connection
  ttl: 14 * 24 * 60 * 60,   // = 14 days. Default
};

exports.keys = 'keys';
