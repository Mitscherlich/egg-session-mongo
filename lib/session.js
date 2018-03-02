'use strict';

const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  _id: String,
  value: String,
  maxAge: {
    type: Number,
    default: Date.now(),
  },
});

SessionSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.maxAge) {
      this.maxAge = this.value._maxAge;
    }
  }

  if (typeof this.value !== 'string') {
    if (typeof this.value === 'object') {
      this.value = JSON.stringify(this.value);
    } else {
      next(new TypeError(`[egg-store-session] invalid type 'value: ${this.value}'.`));
    }
  }

  next();
});

const Session = mongoose.model('Session', SessionSchema);

exports.get = key => new Promise((resolve, reject) => {
  Session.findOne({ _id: key }, function(err, session) {
    if (err) return reject(err);
    return resolve(session ? session.value : '{}');
  });
});

exports.set = (key, value, maxAge) => new Promise((resolve, reject) => {
  Session.findOne({ _id: key }, function(err, session) {
    if (err) return reject(err);

    if (session) {
      session.value = value;
      session.save(function(err) {
        if (err) return reject(err);
        return resolve();
      });
    } else {
      const _session = {
        _id: key,
        value, expire: maxAge,
      };

      const session = new Session(_session);

      session.save(function(err) {
        if (err) return reject(err);
        return resolve();
      });
    }
  });
});

exports.del = key => new Promise((resolve, reject) => {
  Session.remove({ _id: key }, function(err) {
    if (err) return reject(err);
    return resolve();
  });
});
