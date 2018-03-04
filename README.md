# egg-session-mongo

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-session-mongo.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-session-mongo
[travis-image]: https://img.shields.io/travis/Mitscherlich/egg-session-mongo.svg?style=flat-square
[travis-url]: https://travis-ci.org/Mitscherlich/egg-session-mongo
[codecov-image]: https://img.shields.io/codecov/c/github/Mitscherlich/egg-session-mongo.svg?style=flat-square
[codecov-url]: https://codecov.io/github/Mitscherlich/egg-session-mongo?branch=master
[david-image]: https://img.shields.io/david/Mitscherlich/egg-session-mongo.svg?style=flat-square
[david-url]: https://david-dm.org/Mitscherlich/egg-session-mongo
[snyk-image]: https://snyk.io/test/npm/egg-session-mongo/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-session-mongo
[download-image]: https://img.shields.io/npm/dm/egg-session-mongo.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-session-mongo

A session extension for store session in MongoDB.

see Chinese version: [中文](README.zh_CN.md)

## Install

```bash
$ npm i egg-session-mongo --save
```

## Usage

```js
// {app_root}/config/plugin.js
exports.sessionMongo = {
  enable: true,
  package: 'egg-session-mongo',
};
```

or you can overwrite you `MongoStore` options in `app.js`

```js
// {app_root}/app.js
module.exports = app => {
  const MongoStore = require('egg-session-mongo')(app);

  app.beforeStart(async () => {
    app.sessionStore = new MongStore(/* options */);
  });
};
```

see [app.js](app.js) for more detail.

## Configuration

```js
// {app_root}/config/config.default.js
exports.sessionMongo = {
  url: 'mongodb://127.0.0.1/test'
};
```

see [config/config.default.js](config/config.default.js) for more detail.

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
