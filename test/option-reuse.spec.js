const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

const methodsSeen = { head: 0, get: 0 };
server.on("request", (request, response) => {
  response.statusCode = 200;
  response.end("ok");
  methodsSeen[request.method.toLowerCase()]++;
});

suite("Option reuse", () => {
  suiteSetup(done => server.listen(0, done));

  test("options object is not mutated", done => {
    const { url } = server;
    const options = { url };

    request.head(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body, "");
      assert.deepStrictEqual(Object.keys(options).length, 1);
      assert.deepStrictEqual(options.url, url);

      request.get(options, (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(body, "ok");
        assert.deepStrictEqual(Object.keys(options).length, 1);
        assert.deepStrictEqual(options.url, url);

        assert.deepStrictEqual(methodsSeen.head, 1);
        assert.deepStrictEqual(methodsSeen.get, 1);

        done();
      });
    });
  });

  suiteTeardown(done => server.close(done));
});
