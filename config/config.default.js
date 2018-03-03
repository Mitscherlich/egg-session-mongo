'use strict';

/**
 * egg-session-mongo default config
 * @member Config#sessionMongo
 * @property {string}   [url='mongodb://127.0.0.1/test']  - MongoDB server url
 * @property {string}   [collection='sessions']           - Session store collection name
 * @property {Object}   [mongooseConnection]              - Re-use existing or upcoming mongoose connection
 * @property {number}   [ttl=1209600]                     - Session expire time
 */
exports.sessionMongo = {
  url: 'mongodb://127.0.0.1/test',
  collection: 'sessions',
  mongooseConnection: null, // uncomment this to re-use existing or upcoming mongoose connection
  ttl: 14 * 24 * 60 * 60, // = 14 days. Default
};
