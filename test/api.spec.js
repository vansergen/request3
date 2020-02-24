const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.writeHead(202);
  request.pipe(response);
});

suite("Api", () => {
  suiteSetup(done => server.listen(0, done));

  test("callback option", done => {
    request({
      url: server.url,
      callback: (error, response, body) => {
        assert.deepStrictEqual(body, "");
        assert.ifError(error);
        assert.deepStrictEqual(response.statusCode, 202);
        done();
      }
    });
  });

  suiteTeardown(done => server.close(done));
});
