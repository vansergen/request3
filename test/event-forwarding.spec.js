const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.writeHead(200, { "content-type": "text/plain" });
  response.write("waited");
  response.end();
});

suite("Event forwarding", () => {
  suiteSetup(done => server.listen(0, done));

  test("emit socket event", done => {
    let reqChecks = 2;
    const req = request(server.url, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "waited");
      if (--reqChecks === 0) {
        done();
      }
    });

    req.on("socket", socket => {
      assert.deepStrictEqual(req.req.socket, socket);
      if (--reqChecks === 0) {
        done();
      }
    });
  });

  suiteTeardown(done => server.close(done));
});
