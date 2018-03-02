'use strict';

/**
 * egg-session-mongo default config
 * @member Config#sessionMongo
 * @property {String} host  - mongo instance host name
 * @property {Number} port  - mongo instance host port
 * @property {String} username - mongodb user name
 * @property {String} password - mongodb user password
 * @property {String} query - mongo connection query string
 * @property {Number} ttl   - session expire max age
 * @property {Object} store - mongoose connection instance
 * @property {String} db    - session store db name
 */
exports.sessionMongo = {
  host: 'localhost',
  port: 27017,
  // username: '',          // uncomment this for username
  // password: '',          // uncomment this for password
  // query: '',             // uncomment this for query string
  ttl: 1000 * 60 * 60 * 24, // = 1 day. default
  // store: null,           // uncomment this to reuse a exist mongoose connection
  db: 'test', // default is 'test'
};
