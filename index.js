// Copyright 2010-2012 Mikeal Rogers
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

"use strict";

const extend = require("extend");
const cookies = require("./lib/cookies");
const { paramsHaveRequestBody } = require("./lib/helpers");

// organize params for patch, post, put, head, del
function initParams(uri, options, callback) {
  if (typeof options === "function") {
    callback = options;
  }

  const params = {};
  if (options !== null && typeof options === "object") {
    Object.assign(params, options, { uri });
  } else if (typeof uri === "string") {
    Object.assign(params, { uri });
  } else {
    Object.assign(params, uri);
  }

  params.callback = callback || params.callback;
  return params;
}

function request(uri, options, callback) {
  if (typeof uri === "undefined") {
    throw new Error("undefined is not a valid uri or options object.");
  }

  const params = initParams(uri, options, callback);

  if (params.method === "HEAD" && paramsHaveRequestBody(params)) {
    throw new Error("HTTP HEAD requests MUST NOT include a request body.");
  }

  return new request.Request(params);
}

function verbFunc(verb) {
  const method = verb.toUpperCase();
  return (uri, options, callback) => {
    const params = { ...initParams(uri, options, callback), method };
    return request(params, params.callback);
  };
}

// define like this to please codeintel/intellisense IDEs
request.get = verbFunc("get");
request.head = verbFunc("head");
request.options = verbFunc("options");
request.post = verbFunc("post");
request.put = verbFunc("put");
request.patch = verbFunc("patch");
request.del = verbFunc("delete");
request.delete = verbFunc("delete");

request.jar = store => cookies.jar(store);

request.cookie = str => cookies.parse(str);

function wrapRequestMethod(method, options, requester, verb) {
  return (uri, opts, callback) => {
    const params = initParams(uri, opts, callback);

    const target = {};
    extend(true, target, options, params);

    target.pool = params.pool || options.pool;

    if (verb) {
      target.method = verb.toUpperCase();
    }

    if (typeof requester === "function") {
      method = requester;
    }

    return method(target, target.callback);
  };
}

request.defaults = function(options, requester) {
  options = options || {};

  if (typeof options === "function") {
    requester = options;
    options = {};
  }

  const defaults = wrapRequestMethod(this, options, requester);

  const verbs = ["get", "head", "post", "put", "patch", "del", "delete"];
  verbs.forEach(verb => {
    defaults[verb] = wrapRequestMethod(this[verb], options, requester, verb);
  });

  defaults.cookie = wrapRequestMethod(this.cookie, options, requester);
  defaults.jar = this.jar;
  defaults.defaults = this.defaults;
  return defaults;
};

request.forever = (agentOptions, optionsArg = {}) =>
  request.defaults({ ...optionsArg, agentOptions, forever: true });

// Exports

module.exports = request;
request.Request = require("./request");
request.initParams = initParams;

// Backwards compatibility for request.debug
Object.defineProperty(request, "debug", {
  enumerable: true,
  get: () => request.Request.debug,
  set: debug => {
    request.Request.debug = debug;
  }
});
