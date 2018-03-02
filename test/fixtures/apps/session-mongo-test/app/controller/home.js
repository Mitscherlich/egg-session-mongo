'use strict';

exports.get = async ctx => { ctx.body = ctx.session; };

exports.set = async ctx => {
  ctx.session = ctx.query;
  ctx.body = ctx.session;
};

exports.setKey = async ctx => {
  ctx.session.key = ctx.query.key;
  ctx.body = ctx.session;
};

exports.remove = async ctx => {
  ctx.session = null;
  // delete ctx.session;
  ctx.body = ctx.session;
};

exports.maxAge = async ctx => {
  ctx.session.maxAge = Number(ctx.query.maxAge);
  ctx.body = ctx.session;
};
