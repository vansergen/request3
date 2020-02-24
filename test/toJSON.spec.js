const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.statusCode = 200;
  response.end("asdf");
});

suite("toJSON", () => {
  suiteSetup(done => server.listen(0, done));

  test("request().toJSON()", done => {
    const req = request(
      { url: server.url, headers: { foo: "bar" } },
      (error, response) => {
        const jsonReq = JSON.parse(JSON.stringify(req));
        const jsonRes = JSON.parse(JSON.stringify(response));

        assert.deepStrictEqual(error, null);

        assert.deepStrictEqual(jsonReq.uri, req.uri.toString());
        assert.deepStrictEqual(jsonReq.method, req.method);
        assert.deepStrictEqual(jsonReq.headers.foo, req.headers.foo);

        assert.deepStrictEqual(jsonRes.statusCode, response.statusCode);
        assert.deepStrictEqual(jsonRes.body, response.body);
        assert.deepStrictEqual(jsonRes.headers.date, response.headers.date);

        done();
      }
    );
  });

  suiteTeardown(done => server.close(done));
});
