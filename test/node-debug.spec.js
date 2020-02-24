const request = require("../index");
const { createServer } = require("./lib/server");
const assert = require("assert");

const server = createServer();
server.on("request", (request, response) => {
  response.statusCode = 200;
  response.end("");
});

let stderr = [];
let prevStderrLen = 0;

suite("Node debug", () => {
  suiteSetup(done => {
    process.stderr._oldWrite = process.stderr.write;
    process.stderr.write = string => stderr.push(string);
    server.listen(0, done);
  });

  test("a simple request should not fail with debugging enabled", done => {
    request.debug = true;
    assert.deepStrictEqual(
      request.Request.debug,
      true,
      "request.debug sets request.Request.debug"
    );
    assert.deepStrictEqual(
      request.debug,
      true,
      "request.debug gets request.Request.debug"
    );
    stderr = [];

    request(server.url, (err, res) => {
      assert.ifError(err, "the request did not fail");
      assert.ok(res, "the request did not fail");

      assert.ok(stderr.length, "stderr has some messages");
      const url = server.url.replace(/\//g, "\\/");
      const patterns = [
        /^REQUEST { uri: /,
        new RegExp("^REQUEST make request " + url + "/\n$"),
        /^REQUEST onRequestResponse /,
        /^REQUEST finish init /,
        /^REQUEST response end /,
        /^REQUEST end event /,
        /^REQUEST emitting complete /
      ];
      patterns.forEach(pattern => {
        let found = false;
        stderr.forEach(msg => {
          if (pattern.test(msg)) {
            found = true;
          }
        });
        assert.ok(found, "a log message matches " + pattern);
      });
      prevStderrLen = stderr.length;
      done();
    });
  });

  test("there should be no further lookups on process.env", done => {
    process.env.NODE_DEBUG = "";
    stderr = [];

    request(server.url, (err, res) => {
      assert.ifError(err, "the request did not fail");
      assert.ok(res, "the request did not fail");
      assert.deepStrictEqual(
        stderr.length,
        prevStderrLen,
        "env.NODE_DEBUG is not retested"
      );
      done();
    });
  });

  test("it should be possible to disable debugging at runtime", done => {
    request.debug = false;
    assert.deepStrictEqual(
      request.Request.debug,
      false,
      "request.debug sets request.Request.debug"
    );
    assert.deepStrictEqual(
      request.debug,
      false,
      "request.debug gets request.Request.debug"
    );
    stderr = [];

    request(server.url, (err, res) => {
      assert.ifError(err, "the request did not fail");
      assert.ok(res, "the request did not fail");
      assert.deepStrictEqual(stderr.length, 0, "debugging can be disabled");
      done();
    });
  });

  suiteTeardown(done => {
    process.stderr.write = process.stderr._oldWrite;
    delete process.stderr._oldWrite;
    server.close(done);
  });
});
