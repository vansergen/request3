const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (req, response) => {
  response.statusCode = 200;
  if (req.url === "/get") {
    assert.deepStrictEqual(req.method, "GET");
    response.write("content");
    response.end();
  } else if (req.url === "/put") {
    let x = "";
    assert.deepStrictEqual(req.method, "PUT");
    req.on("data", chunk => (x += chunk));
    req.on("end", () => {
      assert.deepStrictEqual(x, "content");
      response.write("success");
      response.end();
    });
  } else if (req.url === "/proxy") {
    assert.deepStrictEqual(req.method, "PUT");
    req.pipe(request(server.url + "/put")).pipe(response);
  } else if (req.url === "/test") {
    request(server.url + "/get")
      .pipe(request.put(server.url + "/proxy"))
      .pipe(response);
  } else {
    throw new Error("Unknown url", request.url);
  }
});

suite("One-line proxy", () => {
  suiteSetup(done => server.listen(0, done));

  test("chained one-line proxying", done => {
    request(server.url + "/test", (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "success");
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
