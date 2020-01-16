const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();
const fs = require("fs");
const rimraf = require("rimraf");

const rawPath = [null, "raw", "path"].join("/");
const queryPath = [null, "query", "path"].join("/");
const searchString = "?foo=bar";
const socket = [__dirname, "tmp-socket"].join("/");
const rawPathname = socket + ":" + rawPath;
const queryPathname = socket + ":" + queryPath;
const expectedBody = "connected";
const statusCode = 200;

rimraf.sync(socket);
server.on("request", (request, response) => {
  const incomingUrl = new URL(request.url, "http://unix/");
  switch (incomingUrl.pathname) {
    case rawPathname:
      assert.deepStrictEqual(
        incomingUrl.pathname,
        rawPathname,
        "requested path is sent to server"
      );
      break;

    case queryPathname:
      assert.deepStrictEqual(
        incomingUrl.pathname,
        queryPathname,
        "requested path is sent to server"
      );
      assert.deepStrictEqual(
        incomingUrl.search,
        searchString,
        "query string is sent to server"
      );
      break;

    default:
      assert(false, "A valid path was requested");
  }
  response.statusCode = statusCode;
  response.end(expectedBody);
});

suite("Unix", () => {
  suiteSetup(done => server.listen(socket, done));

  test("unix socket connection", done => {
    request(
      "http://unix:" + socket + ":" + rawPath,
      (error, response, body) => {
        assert.deepStrictEqual(error, null, "no error in connection");
        assert.deepStrictEqual(
          response.statusCode,
          statusCode,
          "got HTTP 200 OK response"
        );
        assert.deepStrictEqual(
          body,
          expectedBody,
          "expected response body is received"
        );
        done();
      }
    );
  });

  test("unix socket connection with qs", done => {
    request(
      { uri: "http://unix:" + socket + ":" + queryPath, qs: { foo: "bar" } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null, "no error in connection");
        assert.deepStrictEqual(
          response.statusCode,
          statusCode,
          "got HTTP 200 OK response"
        );
        assert.deepStrictEqual(
          body,
          expectedBody,
          "expected response body is received"
        );
        done();
      }
    );
  });

  suiteTeardown(done => {
    server.close(() =>
      fs.unlink(socket, () => {
        done();
      })
    );
  });
});
