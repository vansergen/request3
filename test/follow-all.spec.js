const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  // redirect everything 3 times, no matter what.
  let c = request.headers.cookie;

  if (!c) {
    c = 0;
  } else {
    c = +c.split("=")[1] || 0;
  }

  if (c > 3) {
    response.statusCode = 200;
    response.end("ok");
    return;
  }

  response.setHeader("set-cookie", "c=" + (c + 1));
  response.setHeader("location", request.url);
  response.statusCode = 302;
  response.end("try again");
});

suite("Follow all", () => {
  suiteSetup(done => server.listen(0, done));

  test("followAllRedirects", done => {
    let redirects = 0;
    const url = server.url + "/foo";
    request
      .post(
        { url, followAllRedirects: true, jar: true, form: { foo: "bar" } },
        (error, response, body) => {
          assert.deepStrictEqual(error, null);
          assert.deepStrictEqual(response.statusCode, 200);
          assert.deepStrictEqual(body, "ok");
          assert.deepStrictEqual(redirects, 4);
          done();
        }
      )
      .on("redirect", () => redirects++);
  });

  suiteTeardown(done => server.close(done));
});
