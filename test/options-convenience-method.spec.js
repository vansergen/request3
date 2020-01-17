const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("/options", (request, response) => {
  response.writeHead(200, {
    "x-original-method": request.method,
    allow: "OPTIONS, GET, HEAD"
  });
  response.end();
});

suite("Options (convenience method)", () => {
  suiteSetup(done => server.listen(0, done));

  test("options(string, function)", done => {
    request.options(server.url + "/options", (error, response) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(response.headers["x-original-method"], "OPTIONS");
      done();
    });
  });

  test("options(object, function)", done => {
    request.options(
      { url: server.url + "/options", headers: { foo: "bar" } },
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(
          response.headers["x-original-method"],
          "OPTIONS"
        );
        done();
      }
    );
  });

  suiteTeardown(done => server.close(done));
});
