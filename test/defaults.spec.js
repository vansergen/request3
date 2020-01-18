const request = require("../index");
const assert = require("assert");
const qs = require("qs");
const server = require("./lib/server").createServer();

server.on("/", (request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      method: request.method,
      headers: request.headers,
      qs: qs.parse(request.url.replace(/.*\?(.*)/, "$1"))
    })
  );
});
server.on("/head", (request, response) => {
  const { method, headers } = request;
  response.writeHead(200, { "x-data": JSON.stringify({ method, headers }) });
  response.end();
});
server.on("/set-undefined", (request, response) => {
  let data = "";
  request.on("data", d => (data += d));
  request.on("end", () => {
    const { method, headers } = request;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ method, headers, data: JSON.parse(data) }));
  });
});

suite("defaults", () => {
  suiteSetup(done => server.listen(0, done));

  test("get(string, function)", done => {
    const req = request.defaults({ headers: { foo: "bar" } });
    req(server.url + "/", (error, request, body) => {
      assert.deepStrictEqual(error, null);
      body = JSON.parse(body);
      assert.deepStrictEqual(body.method, "GET");
      assert.deepStrictEqual(body.headers.foo, "bar");
      done();
    });
  });

  test("merge headers", done => {
    const req = request.defaults({ headers: { foo: "bar", merged: "no" } });
    const headers = { merged: "yes" };
    req(server.url + "/", { headers, json: true }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.headers.foo, "bar");
      assert.deepStrictEqual(body.headers.merged, "yes");
      done();
    });
  });

  test("deep extend", done => {
    const req = request.defaults({
      headers: { a: 1, b: 2 },
      qs: { a: 1, b: 2 }
    });
    const options = { headers: { b: 3, c: 4 }, qs: { b: 3, c: 4 }, json: true };
    req(server.url + "/", options, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      delete body.headers.host;
      delete body.headers.accept;
      delete body.headers.connection;
      assert.deepStrictEqual(body.headers, { a: "1", b: "3", c: "4" });
      assert.deepStrictEqual(body.qs, { a: "1", b: "3", c: "4" });
      done();
    });
  });

  test("default undefined header", done => {
    const headers = { foo: "bar", test: undefined };
    const req = request.defaults({ headers, json: true });
    req(server.url + "/", (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "GET");
      assert.deepStrictEqual(body.headers.foo, "bar");
      assert.deepStrictEqual(body.headers.test, undefined);
      done();
    });
  });

  test("post(string, object, function)", done => {
    const req = request.defaults({ headers: { foo: "bar" } });
    req.post(server.url + "/", { json: true }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "POST");
      assert.deepStrictEqual(body.headers.foo, "bar");
      assert.deepStrictEqual(body.headers["content-type"], undefined);
      done();
    });
  });

  test("patch(string, object, function)", done => {
    const req = request.defaults({ headers: { foo: "bar" } });
    req.patch(server.url + "/", { json: true }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "PATCH");
      assert.deepStrictEqual(body.headers.foo, "bar");
      assert.deepStrictEqual(body.headers["content-type"], undefined);
      done();
    });
  });

  test("post(string, object, function) with body", done => {
    const req = request.defaults({ headers: { foo: "bar" } });
    const uri = server.url + "/";
    const options = { json: true, body: { bar: "baz" } };
    req.post(uri, options, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "POST");
      assert.deepStrictEqual(body.headers.foo, "bar");
      assert.deepStrictEqual(body.headers["content-type"], "application/json");
      done();
    });
  });

  test("del(string, function)", done => {
    const req = request.defaults({ headers: { foo: "bar" }, json: true });
    req.del(server.url + "/", (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "DELETE");
      assert.deepStrictEqual(body.headers.foo, "bar");
      done();
    });
  });

  test("delete(string, function)", done => {
    const req = request.defaults({ headers: { foo: "bar" }, json: true });
    req.delete(server.url + "/", (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "DELETE");
      assert.deepStrictEqual(body.headers.foo, "bar");
      done();
    });
  });

  test("head(object, function)", done => {
    const req = request.defaults({ headers: { foo: "bar" } });
    req.head({ uri: server.url + "/head" }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      body = JSON.parse(request.headers["x-data"]);
      assert.deepStrictEqual(body.method, "HEAD");
      assert.deepStrictEqual(body.headers.foo, "bar");
      done();
    });
  });

  test("recursive defaults", done => {
    const req1 = request.defaults({ headers: { foo: "bar1" } });
    const req2 = req1.defaults({ headers: { baz: "bar2" } });
    const req3 = req2.defaults({}, (options, callback) => {
      options.headers = { foo: "bar3" };
      req2(options, callback);
    });
    req1(server.url + "/", { json: true }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "GET");
      assert.deepStrictEqual(body.headers.foo, "bar1");
      req2(server.url + "/", { json: true }, (error, request, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(body.method, "GET");
        assert.deepStrictEqual(body.headers.foo, "bar1");
        assert.deepStrictEqual(body.headers.baz, "bar2");
        // requester function on recursive defaults
        req3(server.url + "/", { json: true }, (error, request, body) => {
          assert.deepStrictEqual(error, null);
          assert.deepStrictEqual(body.method, "GET");
          assert.deepStrictEqual(body.headers.foo, "bar3");
          assert.deepStrictEqual(body.headers.baz, "bar2");
          req2.get(server.url + "/", { json: true }, (error, request, body) => {
            assert.deepStrictEqual(error, null);
            assert.deepStrictEqual(body.method, "GET");
            assert.deepStrictEqual(body.headers.foo, "bar1");
            assert.deepStrictEqual(body.headers.baz, "bar2");
            done();
          });
        });
      });
    });
  });

  test("recursive defaults requester", done => {
    const req1 = request.defaults({}, (options, callback) => {
      const headers = options.headers || {};
      headers.foo = "bar1";
      options.headers = headers;

      request(options, callback);
    });
    const req2 = req1.defaults({}, (options, callback) => {
      const headers = options.headers || {};
      headers.baz = "bar2";
      options.headers = headers;
      req1(options, callback);
    });
    req1.get(server.url + "/", { json: true }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "GET");
      assert.deepStrictEqual(body.headers.foo, "bar1");
      req2.get(server.url + "/", { json: true }, (error, request, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(body.method, "GET");
        assert.deepStrictEqual(body.headers.foo, "bar1");
        assert.deepStrictEqual(body.headers.baz, "bar2");
        done();
      });
    });
  });

  test("defaults.head", done => {
    const options = { headers: { foo: "bar" }, body: "TESTING!" };
    const req = request.defaults(options, (uri, options, callback) => {
      const params = request.initParams(uri, options, callback);
      params.headers.x = "y";
      return request(params.uri, params, params.callback);
    });
    try {
      req.head(server.url + "/", () => {
        throw new Error("We should never get here");
      });
    } catch (error) {
      const message = "HTTP HEAD requests MUST NOT include a request body.";
      assert.deepStrictEqual(error.message, message);
      done();
    }
  });

  test("test custom request handler function", done => {
    const options = { headers: { foo: "bar" }, body: "TESTING!" };
    const req = request.defaults(options, (uri, options, callback) => {
      const params = request.initParams(uri, options, callback);
      params.headers.x = "y";
      return request(params.uri, params, params.callback);
    });

    req.get(server.url + "/", (error, request, body) => {
      assert.deepStrictEqual(error, null);
      body = JSON.parse(body);
      assert.deepStrictEqual(body.headers.foo, "bar");
      assert.deepStrictEqual(body.headers.x, "y");
      done();
    });
  });

  test("test custom request handler function without options", done => {
    const req = request.defaults((uri, options, callback) => {
      const params = request.initParams(uri, options, callback);
      const headers = params.headers || {};
      headers.x = "y";
      headers.foo = "bar";
      params.headers = headers;
      return request(params.uri, params, params.callback);
    });
    req.get(server.url + "/", (error, request, body) => {
      assert.deepStrictEqual(error, null);
      body = JSON.parse(body);
      assert.deepStrictEqual(body.headers.foo, "bar");
      assert.deepStrictEqual(body.headers.x, "y");
      done();
    });
  });

  test("test only setting undefined properties", done => {
    const headers = { "x-foo": "bar" };
    const req = request.defaults({ method: "post", json: true, headers });
    const uri = server.url + "/set-undefined";
    const json = { foo: "bar" };
    req({ uri, json, headers: { "x-foo": "baz" } }, (error, request, body) => {
      assert.deepStrictEqual(body.method, "POST");
      assert.deepStrictEqual(body.headers["content-type"], "application/json");
      assert.deepStrictEqual(body.headers["x-foo"], "baz");
      assert.deepStrictEqual(body.data, json);
      done();
    });
  });

  test("test only function", done => {
    const req = request.defaults();
    assert.doesNotThrow(() => {
      req(server.url + "/", (error, request) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(request.statusCode, 200);
        done();
      });
    });
  });

  test("invoke defaults", done => {
    const headers = { foo: "bar" };
    const req = request.defaults({ uri: server.url + "/", headers });
    req({ json: true }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "GET");
      assert.deepStrictEqual(body.headers.foo, headers.foo);
      done();
    });
  });

  test("invoke convenience method from defaults", done => {
    const headers = { foo: "bar" };
    const req = request.defaults({ uri: server.url + "/", headers });
    req.get({ json: true }, (error, request, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body.method, "GET");
      assert.deepStrictEqual(body.headers.foo, headers.foo);
      done();
    });
  });

  test("defaults without options", done => {
    const req = request.defaults();
    req.get(server.url + "/", { json: true }, (error, request) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(request.statusCode, 200);
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
