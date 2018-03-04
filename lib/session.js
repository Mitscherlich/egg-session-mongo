'use strict';

const EventEmitter = require('events').EventEmitter;
const MongoClient = require('mongodb').MongoClient;

function defaultSerializeFunction(session) {
  // Copy each property of the session to a new object
  const obj = {};
  let prop;

  for (prop in session) {
    if (prop === 'cookie') {
      // Convert the cookie instance to an object, if possible
      // This gets rid of the duplicate object under session.cookie.data property
      obj.cookie = session.cookie.toJSON ? session.cookie.toJSON() : session.cookie;
    } else {
      obj[prop] = session[prop];
    }
  }

  return obj;
}

function computeTransformFunctions(options, defaultStringify) {
  if (options.serialize || options.unserialize) {
    return {
      serialize: options.serialize || defaultSerializeFunction,
      unserialize: options.unserialize || (x => x),
    };
  }

  if (options.stringify === false || defaultStringify === false) {
    return {
      serialize: defaultSerializeFunction,
      unserialize: x => x,
    };
  }

  if (options.stringify === true || defaultStringify === true) {
    return {
      serialize: JSON.stringify,
      unserialize: JSON.parse,
    };
  }
}

module.exports = app => {
  const MemoryStore = app.sessionStore;

  const options = app.config.sessionMongo || {};

  /* Fallback */
  if (options.fallbackMemory === true) {
    return MemoryStore.prototype;
  }

  class MongoStore extends EventEmitter {
    constructor(options) {
      super();

      /* Options */
      this.ttl = options.ttl || 1209600; // 14 days
      this.dbName = options.name || options.url.split('/').pop();
      this.collectionName = options.collection || 'sessions';
      this.autoRemove = options.autoRemove || 'native';
      this.autoRemoveInterval = options.autoRemoveInterval || 10;
      this.transformFunctions = computeTransformFunctions(options, true);

      this.options = options;

      this.changeState('init');

      const newConnectionCallback = (err, client) => {
        if (err) {
          this.connectionFailed(err);
        } else {
          this.handleNewConnectionAsync(client.db(this.dbName));
        }
      };

      if (options.url) {
        // New native connection using url + mongoOptions
        MongoClient.connect(options.url, options.mongoOptions || {}, newConnectionCallback);
      } else if (options.mongooseConnection) {
        // Re-use existing or upcoming mongoose connection
        if (options.mongooseConnection.readyState === 1) {
          this.handleNewConnectionAsync(options.mongooseConnection.db);
        } else {
          options.mongooseConnection.once('open', () => this.handleNewConnectionAsync(options.mongooseConnection.db));
        }
      } else if (options.db && options.db.listCollections) {
        // Re-use existing or upcoming native connection
        if (options.db.openCalled || options.db.openCalled === undefined) { // OpenCalled is undefined in mongodb@2.x
          this.handleNewConnectionAsync(options.db);
        } else {
          options.db.open(newConnectionCallback);
        }
      } else if (options.dbPromise) {
        options.dbPromise
          .then(db => this.handleNewConnectionAsync(db))
          .catch(err => this.connectionFailed(err));
      } else {
        throw new Error('Connection strategy not found');
      }

      this.changeState('connecting');
    }

    connectionFailed(err) {
      this.changeState('disconnected');
      throw err;
    }

    handleNewConnectionAsync(db) {
      this.db = db;
      return this
        .setCollection(db.collection(this.collectionName))
        .setAutoRemoveAsync()
        .then(() => this.changeState('connected'));
    }

    setAutoRemoveAsync() {
      const removeQuery = { expires: { $lt: new Date() } };
      switch (this.autoRemove) {
        case 'native':
          return this.collection.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
        case 'interval':
          this.timer = setInterval(() => this.collection.remove(removeQuery, { w: 0 }), this.autoRemoveInterval * 1000 * 60);
          this.timer.unref();
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    }

    changeState(newState) {
      if (newState !== this.state) {
        this.state = newState;
        this.emit(newState);
      }
    }

    setCollection(collection) {
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.collectionReadyPromise = undefined;
      this.collection = collection;

      return this;
    }

    collectionReady() {
      let promise = this.collectionReadyPromise;
      if (!promise) {
        promise = new Promise((resolve, reject) => {
          if (this.state === 'connected') {
            return resolve(this.collection);
          }
          if (this.state === 'connecting') {
            return this.once('connected', () => resolve(this.collection));
          }
          reject(new Error('Not connected'));
        });
        this.collectionReadyPromise = promise;
      }
      return promise;
    }

    computeStorageId(sessionId) {
      if (this.options.transformId && typeof this.options.transformId === 'function') {
        return this.options.transformId(sessionId);
      }
      return sessionId;
    }

    /* Public API */

    async get(sid) {
      return await this.collectionReady()
        .then(collection => collection.findOne({
          _id: this.computeStorageId(sid),
          $or: [
            { expires: { $exists: false } },
            { expires: { $gt: new Date() } },
          ],
        }))
        .then(session => {
          if (session) {
            const s = this.transformFunctions.unserialize(session.session);
            if (this.options.touchAfter > 0 && session.lastModified) {
              s.lastModified = session.lastModified;
            }
            this.emit('get', sid);
            return s;
          }
        });
    }

    async set(sid, session, maxAge) {
      // Removing the lastModified prop from the session object before update
      if (this.options.touchAfter > 0 && session && session.lastModified) {
        delete session.lastModified;
      }

      const s = { _id: this.computeStorageId(sid), session: this.transformFunctions.serialize(session) };

      if (session && session._expire) {
        s.expires = new Date(session._expire);
      } else {
        // If there's no expiration date specified, it is
        // browser-session cookie or there is no cookie at all,
        // as per the connect docs.
        //
        // So we set the expiration to two-weeks from now
        // - as is common practice in the industry (e.g Django) -
        // or the default specified in the options.
        s.expires = new Date(Date.now() + ((maxAge || this.ttl) * 1000));
      }

      if (this.options.touchAfter > 0) {
        s.lastModified = new Date();
      }

      await this.collectionReady()
        .then(collection => collection.update({ _id: this.computeStorageId(sid) }, s, { upsert: true }))
        .then(rawResponse => {
          if (rawResponse.result) {
            rawResponse = rawResponse.result;
          }
          if (rawResponse && rawResponse.upserted) {
            this.emit('create', sid);
          } else {
            this.emit('update', sid);
          }
          this.emit('set', sid);
        });
    }

    async destroy(sid) {
      await this.collectionReady()
        .then(collection => collection.remove({ _id: this.computeStorageId(sid) }))
        .then(() => this.emit('destroy', sid));
    }
  }

  return MongoStore;
};
