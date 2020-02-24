"use strict";

const jsonSafeStringify = require("json-stringify-safe");
const { createHash } = require("crypto");

const defer =
  typeof setImmediate === "undefined" ? process.nextTick : setImmediate;

function paramsHaveRequestBody(params) {
  return (
    params.body ||
    params.requestBodyStream ||
    (params.json && typeof params.json !== "boolean") ||
    params.multipart
  );
}

function safeStringify(obj, replacer) {
  try {
    return JSON.stringify(obj, replacer);
  } catch (error) {
    return jsonSafeStringify(obj, replacer);
  }
}

function md5(str) {
  return createHash("md5")
    .update(str)
    .digest("hex");
}

function isReadStream(rs) {
  return rs.readable && rs.path && rs.mode;
}

function toBase64(str) {
  return Buffer.from(str || "", "utf8").toString("base64");
}

function copy(obj) {
  const o = {};
  Object.keys(obj).forEach(i => (o[i] = obj[i]));
  return o;
}

module.exports = {
  paramsHaveRequestBody,
  safeStringify,
  md5,
  isReadStream,
  toBase64,
  copy,
  defer
};
