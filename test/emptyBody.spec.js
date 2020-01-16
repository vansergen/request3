const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.statusCode = 200;
  response.end("");
});

suite("emptyBody", () => {
  suiteSetup(done => server.listen(0, done));

  test("empty body with encoding", done => {
    request(server.url, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "");
      done();
    });
  });

  test("empty body without encoding", done => {
    request({ url: server.url, encoding: null }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, Buffer.alloc(0));
      done();
    });
  });

  test("empty JSON body", done => {
    request({ url: server.url, json: {} }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, undefined);
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
