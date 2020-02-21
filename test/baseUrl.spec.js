const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  if (request.url === "/redirect/") {
    response.writeHead(302, { location: "/" });
  } else {
    response.statusCode = 200;
    response.setHeader("X-PATH", request.url);
  }
  response.end("ok");
});

suite("baseUrl", () => {
  suiteSetup(done => server.listen(0, done));

  test("baseUrl", done => {
    request("resource", { baseUrl: server.url }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  test("baseUrl defaults", done => {
    const withDefaults = request.defaults({ baseUrl: server.url });
    withDefaults("resource", (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  test("baseUrl and redirects", done => {
    request(
      "/",
      { baseUrl: server.url + "/redirect" },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(body, "ok");
        assert.deepStrictEqual(response.headers["x-path"], "/");
        done();
      }
    );
  });

  test("error when baseUrl is not a String", done => {
    request("resource", { baseUrl: new URL("/path", server.url) }, error => {
      assert.notStrictEqual(error, null);
      assert.deepStrictEqual(error.message, "options.baseUrl must be a string");
      done();
    });
  });

  test("error when uri is not a String", done => {
    request(
      new URL("resource", server.url),
      { baseUrl: server.url + "/path" },
      error => {
        assert.notStrictEqual(error, null);
        assert.deepStrictEqual(
          error.message,
          "options.uri must be a string when using options.baseUrl"
        );
        done();
      }
    );
  });

  test("error on baseUrl and uri with scheme", done => {
    request(
      server.url + "/path/ignoring/baseUrl",
      { baseUrl: server.url + "/path/" },
      error => {
        assert.notStrictEqual(error, null);
        assert.deepStrictEqual(
          error.message,
          "options.uri must be a path when using options.baseUrl"
        );
        done();
      }
    );
  });

  test("error on baseUrl and uri with scheme-relative url", done => {
    request(
      server.url.slice("http:".length) + "/path/ignoring/baseUrl",
      { baseUrl: server.url + "/path/" },
      error => {
        assert.notStrictEqual(error, null);
        assert.deepStrictEqual(
          error.message,
          "options.uri must be a path when using options.baseUrl"
        );
        done();
      }
    );
  });

  suite("baseUrl=", () => {
    const tests = [
      ["", "", "/"],
      ["/", "", "/"],
      ["", "/", "/"],
      ["/", "/", "/"],
      ["/api", "", "/api"],
      ["/api/", "", "/api/"],
      ["/api", "/", "/api/"],
      ["/api/", "/", "/api/"],
      ["/api", "resource", "/api/resource"],
      ["/api/", "resource", "/api/resource"],
      ["/api", "/resource", "/api/resource"],
      ["/api/", "/resource", "/api/resource"],
      ["/api", "resource/", "/api/resource/"],
      ["/api/", "resource/", "/api/resource/"],
      ["/api", "/resource/", "/api/resource/"],
      ["/api/", "/resource/", "/api/resource/"]
    ];

    tests.forEach(([base, uri, expected]) => {
      test("\"" + "server.url" + base + "\" uri=\"" + uri + "\"", done => {
        const baseUrl = server.url + base;
        request(uri, { baseUrl }, (error, response, body) => {
          assert.deepStrictEqual(error, null);
          assert.deepStrictEqual(body, "ok");
          assert.deepStrictEqual(response.headers["x-path"], expected);
          done();
        });
      });
    });
  });

  suiteTeardown(done => server.close(done));
});
