const request = require("../index");
const assert = require("assert");
const server1 = require("./lib/server").createServer();
const server2 = require("./lib/server").createServer();

server1.on("request", (request, response) => {
  if (request.url === "/original") {
    response.writeHeader(302, { location: "/redirected" });
    response.end();
  } else if (request.url === "/redirected") {
    response.writeHeader(200, { "content-type": "text/plain" });
    response.write("OK");
    response.end();
  }
});
server2.on("request", (req, response) => {
  const r = request(server1.url + "/original");
  req.pipe(r);
  r.pipe(response);
});

suite("Piped redirect", () => {
  suiteSetup(done => server1.listen(0, () => server2.listen(0, done)));

  test("piped redirect", done => {
    request(server2.url + "/original", (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "OK");
      done();
    });
  });

  suiteTeardown(done => server1.close(() => server2.close(done)));
});
