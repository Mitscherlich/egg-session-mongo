'use strict';

const expect = require('expect.js');
const sleep = require('mz-modules/sleep');
const request = require('supertest');
const assert = require('assert');
const mm = require('egg-mock');

const futureDate = new Date(2030, 1);

const connectionString = process.env.MONGODB_URL || 'mongodb://localhost';

function noop() { }

describe('test/session-mongo.test.js', () => {
  let app;
  let agent;
  let store;
  let collection;

  before(() => {
    app = mm.app({
      baseDir: 'apps/session-mongo-test',
    });
    return app.ready();
  });

  beforeEach(done => {
    const MongoStore = require('..')(app);

    store = new MongoStore({
      url: connectionString,
      db: 'egg-session-mongo-test',
      collection: 'sessions-test',
    });

    store.once('connected', () => {
      collection = store.collection;
      collection.remove({}, done);
    });

    agent = request.agent(app.callback());
  });

  after(() => app.close());
  afterEach(mm.restore);

  it('should get empty session and do not set cookie when session not populated', async () => {
    await agent
      .get('/get')
      .expect(200)
      .expect({})
      .expect(res => {
        assert(!res.header['set-cookie'].join('').match(/EGG_SESS/));
      });
  });

  it('should ctx.session= change the session', async () => {
    await agent
      .get('/set?foo=bar')
      .expect(200)
      .expect({ foo: 'bar' })
      .expect('set-cookie', /EGG_SESS=.*?;/);
  });

  it('should ctx.session.key= change the session', async () => {
    await agent
      .get('/set?key=foo&foo=bar')
      .expect(200)
      .expect({ key: 'foo', foo: 'bar' })
      .expect('set-cookie', /EGG_SESS=.*?;/);

    await agent
      .get('/setKey?key=bar')
      .expect(200)
      .expect({ key: 'bar', foo: 'bar' })
      .expect('set-cookie', /EGG_SESS=.*?;/);
  });

  it('should ctx.session=null remove the session', async () => {
    await agent
      .get('/set?key=foo&foo=bar')
      .expect(200)
      .expect({ key: 'foo', foo: 'bar' })
      .expect('set-cookie', /EGG_SESS=.*?;/);

    await agent
      .get('/remove')
      .expect(204)
      .expect('set-cookie', /EGG_SESS=;/);

    await agent
      .get('/get')
      .expect(200)
      .expect({});
  });

  it('should ctx.session.maxAge= change maxAge', async () => {
    await agent
      .get('/set?key=foo&foo=bar')
      .expect(200)
      .expect({ key: 'foo', foo: 'bar' })
      .expect('set-cookie', /EGG_SESS=.*?;/);

    let cookie;

    await agent
      .get('/maxAge?maxAge=100')
      .expect(200)
      .expect({ key: 'foo', foo: 'bar' })
      .expect(res => {
        cookie = res.headers['set-cookie'].join(';');
        assert(cookie.match(/EGG_SESS=.*?;/));
        assert(cookie.match(/expires=/));
      });

    await sleep(200);

    await agent
      .get('/get')
      .expect(200)
      .expect({});

    await request(app.callback())
      .get('/get')
      .set('cookie', cookie)
      .expect(200)
      .expect({});
  });

  describe('set() with an unknown session id', () => {
    it('should emit a `create` event', done => {
      store.once('create', sid => {
        expect(sid).to.be('foo1');
        done();
      });

      store.set('foo1', { foo: 'bar' }, noop);
    });

    it('should emit a `set` event', done => {
      store.once('set', sid => {
        expect(sid).to.be('foo2');
        done();
      });

      store.set('foo2', { foo: 'bar' }, noop);
    });
  });

  describe('set() with a session id associated to an existing session', () => {
    it('should emit an `update` event', done => {
      store.once('update', sid => {
        expect(sid).to.be('foo3');
        done();
      });

      collection.insert({ _id: 'foo3', session: { foo: 'bar1' }, expires: futureDate }, err => {
        expect(err).not.to.be.ok();
        store.set('foo3', { foo: 'bar2' }, noop);
      });
    });

    it('should emit an `set` event', done => {
      store.once('update', sid => {
        expect(sid).to.be('foo4');
        done();
      });

      collection.insert({ _id: 'foo4', session: { foo: 'bar1' }, expires: futureDate }, err => {
        expect(err).not.to.be.ok();
        store.set('foo4', { foo: 'bar2' }, noop);
      });
    });
  });
});
