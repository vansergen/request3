const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  if (request.method === "POST") {
    response.setHeader("location", request.url);
    response.statusCode = 303;
    response.end("try again");
  } else {
    response.statusCode = 200;
    response.end("ok");
  }
});

suite("Follow all 303", () => {
  suiteSetup(done => server.listen(0, done));

  test("followAllRedirects with 303", done => {
    let redirects = 0;
    const form = { foo: "bar" };

    request
      .post(
        { url: server.url + "/foo", followAllRedirects: true, form },
        (error, response, body) => {
          assert.deepStrictEqual(error, null);
          assert.deepStrictEqual(response.statusCode, 200);
          assert.deepStrictEqual(body, "ok");
          assert.deepStrictEqual(redirects, 1);
          done();
        }
      )
      .on("redirect", () => redirects++);
  });

  suiteTeardown(done => server.close(done));
});
