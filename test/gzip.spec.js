const request = require("../index");
const assert = require("assert");
const zlib = require("zlib");
const server = require("./lib/server").createServer();

const testContent = "Compressible response content.\n";
let testContentBig;
let testContentBigGzip;
let testContentGzip;

server.on("request", (request, response) => {
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/plain");

  if (request.method === "HEAD") {
    response.setHeader("Content-Encoding", "gzip");
    return response.end();
  } else if (request.headers.code) {
    response.writeHead(request.headers.code, {
      "Content-Encoding": "gzip",
      code: request.headers.code
    });
    return response.end();
  }

  if (/\bgzip\b/i.test(request.headers["accept-encoding"])) {
    response.setHeader("Content-Encoding", "gzip");
    if (request.url === "/error") {
      // send plaintext instead of gzip (should cause an error for the client)
      response.end(testContent);
    } else if (request.url === "/chunks") {
      response.writeHead(200);
      response.write(testContentBigGzip.slice(0, 4096));
      setTimeout(() => response.end(testContentBigGzip.slice(4096)), 1);
    } else if (request.url === "/just-slightly-truncated") {
      zlib.gzip(testContent, (error, data) => {
        assert.deepStrictEqual(error, null);
        // truncate the CRC checksum and size check at the end of the stream
        response.end(data.slice(0, data.length - 8));
      });
    } else {
      zlib.gzip(testContent, (error, data) => {
        assert.deepStrictEqual(error, null);
        response.end(data);
      });
    }
  } else if (/\bdeflate\b/i.test(request.headers["accept-encoding"])) {
    response.setHeader("Content-Encoding", "deflate");
    zlib.deflate(testContent, (err, data) => {
      assert.deepStrictEqual(err, null);
      response.end(data);
    });
  } else {
    response.end(testContent);
  }
});

suite("gzip", () => {
  suiteSetup(done => {
    // Need big compressed content to be large enough to chunk into gzip blocks.
    // Want it to be deterministic to ensure test is reliable.
    // Generate pseudo-random printable ASCII characters using MINSTD
    const a = 48271;
    const m = 0x7fffffff;
    let x = 1;
    testContentBig = Buffer.alloc(10240);
    for (let i = 0; i < testContentBig.length; ++i) {
      x = (a * x) & m;
      // Printable ASCII range from 32-126, inclusive
      testContentBig[i] = (x % 95) + 32;
    }

    zlib.gzip(testContent, (error, data) => {
      assert.deepStrictEqual(error, null);
      testContentGzip = data;

      zlib.gzip(testContentBig, (error, data) => {
        assert.deepStrictEqual(error, null);
        testContentBigGzip = data;

        server.listen(0, done);
      });
    });
  });

  test("transparently supports gzip decoding to callbacks", done => {
    const options = { url: server.url + "/foo", gzip: true };
    request.get(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.headers["content-encoding"], "gzip");
      assert.deepStrictEqual(body, testContent);
      done();
    });
  });

  test("supports slightly invalid gzip content", done => {
    const uri = server.url + "/just-slightly-truncated";
    const options = { uri, gzip: true };
    request.get(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.headers["content-encoding"], "gzip");
      assert.deepStrictEqual(body, testContent);
      done();
    });
  });

  test("transparently supports gzip decoding to pipes", done => {
    const options = { url: server.url + "/foo", gzip: true };
    const chunks = [];
    request
      .get(options)
      .on("data", chunk => chunks.push(chunk))
      .on("end", () => {
        assert.deepStrictEqual(Buffer.concat(chunks).toString(), testContent);
        done();
      })
      .on("error", error => assert.fail(error));
  });

  test("does not request gzip if user specifies Accepted-Encodings", done => {
    const headers = { "Accept-Encoding": null };
    const options = { url: server.url + "/foo", headers, gzip: true };
    request.get(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.headers["content-encoding"], undefined);
      assert.deepStrictEqual(body, testContent);
      done();
    });
  });

  test("does not decode user-requested encoding by default", done => {
    const headers = { "Accept-Encoding": "gzip" };
    const options = { url: server.url + "/foo", headers: headers };
    request.get(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.headers["content-encoding"], "gzip");
      assert.deepStrictEqual(body, testContentGzip.toString());
      done();
    });
  });

  test("supports character encoding with gzip encoding", done => {
    const headers = { "Accept-Encoding": "gzip" };
    const uri = server.url + "/foo";
    const options = { uri, headers, gzip: true, encoding: "utf8" };
    const strings = [];
    request
      .get(options)
      .on("data", string => {
        assert.deepStrictEqual(typeof string, "string");
        strings.push(string);
      })
      .on("end", () => {
        assert.deepStrictEqual(strings.join(""), testContent);
        done();
      })
      .on("error", error => assert.fail(error));
  });

  test("transparently supports gzip error to callbacks", done => {
    const options = { url: server.url + "/error", gzip: true };
    request.get(options, (error, response, body) => {
      assert.deepStrictEqual(error.code, "Z_DATA_ERROR");
      assert.deepStrictEqual(response, undefined);
      assert.deepStrictEqual(body, undefined);
      done();
    });
  });

  test("transparently supports gzip error to pipes", done => {
    const options = { url: server.url + "/error", gzip: true };
    request
      .get(options)
      .on("data", () => assert.fail("Should not receive data event"))
      .on("end", () => assert.fail("Should not receive end event"))
      .on("error", error => {
        assert.deepStrictEqual(error.code, "Z_DATA_ERROR");
        done();
      });
  });

  test("pause when streaming from a gzip request object", done => {
    const chunks = [];
    let paused = false;
    const options = { url: server.url + "/chunks", gzip: true };
    const req = request
      .get(options)
      .on("data", chunk => {
        assert.ok(!paused, "Only receive data when not paused");

        chunks.push(chunk);
        if (chunks.length === 1) {
          req.pause();
          paused = true;
          setTimeout(() => {
            paused = false;
            req.resume();
          }, 1);
        }
      })
      .on("end", () => {
        assert.ok(chunks.length > 1, "Received multiple chunks");
        const bufCompare = testContentBig.compare(Buffer.concat(chunks));
        assert.deepStrictEqual(bufCompare, 0, "Expected content");
        done();
      });
  });

  test("pause before streaming from a gzip request object", done => {
    let paused = true;
    const options = { url: server.url + "/foo", gzip: true };
    const req = request.get(options);
    req.pause();
    req.on("data", data => {
      assert.ok(!paused, "Only receive data when not paused");
      assert.deepStrictEqual(data.toString(), testContent);
    });
    req.on("end", done);

    setTimeout(() => {
      paused = false;
      req.resume();
    }, 1);
  });

  test("transparently supports deflate decoding to callbacks", done => {
    const headers = { "Accept-Encoding": "deflate" };
    const options = { url: server.url + "/foo", gzip: true, headers };

    request.get(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.headers["content-encoding"], "deflate");
      assert.deepStrictEqual(body, testContent);
      done();
    });
  });

  test("do not pipe HEAD request responses", done => {
    const options = { method: "HEAD", url: server.url + "/foo", gzip: true };

    request(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body, "");
      done();
    });
  });

  test("do not pipe responses with no body", done => {
    const options = { url: server.url + "/foo", gzip: true };

    const statusCodes = [204, 304];

    const next = index => {
      if (index === statusCodes.length) {
        return done();
      }
      options.headers = { code: statusCodes[index] };
      request.post(options, (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(
          response.headers.code,
          statusCodes[index].toString()
        );
        assert.deepStrictEqual(body, "");
        next(++index);
      });
    };

    next(0);
  });

  suiteTeardown(done => server.close(done));
});
