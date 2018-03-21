'use strict';

const sleep = require('mz-modules/sleep');
const request = require('supertest');
const assert = require('assert');
const mm = require('egg-mock');

describe('test/session-mongo.test.js', () => {
  let app;
  let agent;

  before(() => {
    app = mm.app({ baseDir: 'apps/session-mongo-test' });
    return app.ready();
  });

  beforeEach(() => {
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
});
