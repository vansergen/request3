const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.statusCode = 200;
  response.end("ok");
});

suite("URL", () => {
  suiteSetup(done => server.listen(0, done));

  test("lowercase", done => {
    request(server.url, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  test("uppercase", done => {
    request(server.url.replace("http", "HTTP"), (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  test("mixedcase", done => {
    request(server.url.replace("http", "HtTp"), (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  test("hostname and port", done => {
    request(
      { uri: { protocol: "http:", hostname: "localhost", port: server.port } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "ok");
        done();
      }
    );
  });

  test("hostname and port 1", done => {
    request(
      { uri: { protocol: "http:", hostname: "localhost", port: server.port } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "ok");
        done();
      }
    );
  });

  test("hostname and port 2", done => {
    request(
      { protocol: "http:", hostname: "localhost", port: server.port },
      {}, // need this empty options object, otherwise request thinks no uri was set
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "ok");
        done();
      }
    );
  });

  test("hostname and port 3", done => {
    request(
      { protocol: "http:", hostname: "localhost", port: server.port },
      (error, response, body) => {
        assert.notStrictEqual(error, null);
        assert.deepStrictEqual(
          error.message,
          "options.uri is a required argument"
        );
        assert.deepStrictEqual(body, undefined);
        done();
      }
    );
  });

  test("hostname and query string", done => {
    const uri = { protocol: "http:", hostname: "localhost", port: server.port };
    request({ uri, qs: { test: "test" } }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
