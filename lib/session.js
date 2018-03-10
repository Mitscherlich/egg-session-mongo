'use strict';

const EventEmitter = require('events').EventEmitter;
const MongoClient = require('mongodb').MongoClient;
const Util = require('util');

/* istanbul ignore next */
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

/* istanbul ignore next */
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
  class MongoStore extends EventEmitter {
    constructor(options) {
      super();

      /* Options */
      this.ttl = options.ttl || 1209600; // 14 days
      this.collectionName = options.collection || 'sessions';
      this.autoRemove = options.autoRemove || 'native';
      this.autoRemoveInterval = options.autoRemoveInterval || 10;
      this.transformFunctions = computeTransformFunctions(options, true);

      /* istanbul ignore if */
      if (!options.db) {
        throw new Error(`[egg-session-mongo] must provide 'db' in options but got '${options.db}'`);
      }

      if (typeof options.db === 'string') {
        this.dbName = options.db;
      }

      this.options = options;

      this.changeState('init');

      const newConnectionCallback = (err, client) => {
        /* istanbul ignore if */
        if (err) {
          this.connectionFailed(err);
        } else {
          this.handleNewConnectionAsync(client.db(this.dbName));
        }
      };

      /* istanbul ignore next */
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

    /* istanbul ignore next */
    connectionFailed(err) {
      this.changeState('disconnected');
      throw err;
    }

    /* istanbul ignore next */
    handleNewConnectionAsync(db) {
      this.db = db;
      return this
        .setCollection(db.collection(this.collectionName))
        .setAutoRemoveAsync()
        .then(() => this.changeState('connected'));
    }

    /* istanbul ignore next */
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
      /* istanbul ignore of */
      if (this.timer) {
        clearInterval(this.timer);
      }

      this.collectionReadyPromise = undefined;
      this.collection = collection;

      return this;
    }

    /* istanbul ignore next */
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

    /* istanbul ignore next */
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

      return await this.collectionReady()
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

    /* istanbul ignore next */
    async touch(sid, session) {
      const updateFields = {};
      const touchAfter = this.options.touchAfter * 1000;
      const lastModified = session.lastModified ? session.lastModified.getTime() : 0;
      const currentDate = new Date();

      // If the given options has a touchAfter property, check if the
      // current timestamp - lastModified timestamp is bigger than
      // the specified, if it's not, don't touch the session
      if (touchAfter > 0 && lastModified > 0) {
        const timeElapsed = currentDate.getTime() - session.lastModified;

        if (timeElapsed < touchAfter) {
          return;
        }
        updateFields.lastModified = currentDate;
      }

      if (session && session.cookie && session.cookie.expires) {
        updateFields.expires = new Date(session.cookie.expires);
      } else {
        updateFields.expires = new Date(Date.now() + (this.ttl * 1000));
      }

      return await this.collectionReady()
        .then(collection => collection.update({ _id: this.computeStorageId(sid) }, { $set: updateFields }))
        .then(result => {
          if (result.nModified === 0) {
            throw new Error('Unable to find the session to touch');
          } else {
            this.emit('touch', sid, session);
          }
        });
    }

    /* istanbul ignore next */
    async destroy(sid) {
      return await this.collectionReady()
        .then(collection => collection.remove({ _id: this.computeStorageId(sid) }))
        .then(() => this.emit('destroy', sid));
    }

    /* istanbul ignore next */
    async length() {
      return await this.collectionReady()
        .then(collection => collection.count({}));
    }

    /* istanbul ignore next */
    async clear() {
      return await this.collectionReady()
        .then(collection => collection.drop());
    }

    /* istanbul ignore next */
    async close() {
      if (this.db) {
        this.db.close();
      }
    }
  }

  /* Deprecated APIs    */
  /* istanbul ignore if */
  if (app.config.sessionMongo.fallbackMemory && app.config.sessionMongo.fallbackMemory !== false) {
    Util.deprecate(() => console.log('[egg-session-mongo] option `fallbackMemory` is deprecated. Just disable this plugin in `plugin.default.js`.'));
  }

  return MongoStore;
};
