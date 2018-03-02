'use strict';

const mongoose = require('mongoose');
const assert = require('assert');

const session = require('./lib/session');

const ONE_DAY = 1000 * 60 * 60 * 24;

module.exports = app => {
  const { host, port, username, password, query, db, ttl, store } = app.config.sessionMongo;
  assert(host !== undefined && port && db !== undefined,
    `[egg-store-mongo] need 'host: ${host}', 'port: ${port}', 'db: ${db}' in app.config for mongo session store.`);

  if (store) {
    mongoose.connection = store;
  } else {
    let dbUri = 'mongodb://';

    if (username) {
      if (password) {
        dbUri += `${username}:${password}@`;
      } else {
        dbUri += `${username}@`;
      }
    }

    dbUri += `${host}:${port}/${db}`;

    if (query) {
      dbUri += `?${query}`;
    }

    mongoose.connect(dbUri);
  }

  app.sessionStore = {
    async get(key) {
      const res = await session.get(key);
      if (!res) return null;
      return JSON.parse(res);
    },

    async set(key, value, maxAge) {
      maxAge = maxAge || ttl || ONE_DAY;
      // console.log('value', value);
      value = JSON.stringify(value);
      await session.set(key, value, maxAge);
    },

    async destroy(key) {
      await session.del(key);
    },
  };
};
