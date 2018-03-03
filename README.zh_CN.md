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

基于 [`connect-mongo`](https://github.com/jdesboeufs/connect-mongo) 的 [`egg-session`](https://github.com/eggjs/egg-session) 外部存储插件，将 `session` 存储在 `MongoDB` 中。支持 `connect-mongo` 所有配置。

## 依赖说明

### 依赖的 egg 版本

egg-session-mongo 版本 | egg 1.x
--- | ---
1.x | 😁
0.x | ❌

## 开启插件

```js
// {app_root}/config/plugin.js
exports.sessionMongo = {
  enable: true,
  package: 'egg-session-mongo',
};
```

## 使用场景

支持在 `egg.js` 中扩展插件 `egg-session`，将 session 数据存储在外部 `MongoDB` 数据库中。基于 `connect-mongo` 开发，兼容其所有的配置选项，基于 `native-node-mongo` 原生模块链接 `MongoDB` 链接数据库，可以复用已有的 `mongoose` 或 `mongodb` 数据库连接。

## 详细配置

请到 [config/config.default.js](config/config.default.js) 查看详细配置项说明。

## 单元测试

```bash
$ git clone --depth 1 https://github.com/Mitscherlich/egg-session-mongo && cd egg-session-mongo
$ npm run test
```

## 提问交流

请到 [egg issues](https://github.com/eggjs/egg/issues) 异步交流。

## License

[MIT](LICENSE)
