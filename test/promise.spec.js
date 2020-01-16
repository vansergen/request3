const request = require("../index");
const assert = require("assert");
const Promise = require("bluebird");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.writeHead(200, {});
  response.end("ok");
});

suite("Promise", () => {
  suiteSetup(done => server.listen(0, done));

  test("promisify convenience method", done => {
    const { get } = request;
    const p = Promise.promisify(get, { multiArgs: true });
    p(server.url).then(results => {
      const [response, body] = results;
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  test("promisify request function", done => {
    const p = Promise.promisify(request, { multiArgs: true });
    p(server.url).spread((response, body) => {
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  test("promisify all methods", done => {
    Promise.promisifyAll(request, { multiArgs: true });
    request.getAsync(server.url).spread((response, body) => {
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "ok");
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
