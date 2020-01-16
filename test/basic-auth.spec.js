const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

let numBasicRequests = 0;
server.on("request", (request, response) => {
  numBasicRequests++;

  let ok;

  if (request.headers.authorization) {
    if (
      request.headers.authorization ===
      "Basic " + Buffer.from("user:pass").toString("base64")
    ) {
      ok = true;
    } else if (
      request.headers.authorization ===
      "Basic " + Buffer.from("user:").toString("base64")
    ) {
      ok = true;
    } else if (
      request.headers.authorization ===
      "Basic " + Buffer.from(":pass").toString("base64")
    ) {
      ok = true;
    } else if (
      request.headers.authorization ===
      "Basic " + Buffer.from("user:pâss").toString("base64")
    ) {
      ok = true;
    } else {
      // Bad auth header, don't send back WWW-Authenticate header
      ok = false;
    }
  } else {
    // No auth header, send back WWW-Authenticate header
    ok = false;
    response.setHeader("www-authenticate", "Basic realm=\"Private\"");
  }

  if (request.url === "/post/") {
    const expectedContent = "key=value";
    request.on("data", data => {
      assert.strictEqual(Buffer.from(data).toString(), expectedContent);
    });
    assert.strictEqual(request.method, "POST");
    assert.strictEqual(
      request.headers["content-length"],
      "" + expectedContent.length
    );
    assert.strictEqual(
      request.headers["content-type"],
      "application/x-www-form-urlencoded"
    );
  }

  if (ok) {
    response.end("ok");
  } else {
    response.statusCode = 401;
    response.end("401");
  }
});

suite("Basic auth", () => {
  suiteSetup(done => server.listen(0, done));

  test("sendImmediately - false", done => {
    const auth = { user: "user", pass: "pass", sendImmediately: false };
    const uri = server.url + "/test/";
    const req = request({ method: "GET", uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(req._auth.user, "user");
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBasicRequests, 2);
      done();
    });
  });

  test("sendImmediately - true", done => {
    // If we don't set sendImmediately = false, request will send basic auth
    const auth = { user: "user", pass: "pass" };
    const uri = server.url + "/test2/";
    const req = request({ method: "GET", uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(req._auth.user, "user");
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBasicRequests, 3);
      done();
    });
  });

  test("credentials in url", done => {
    const uri = server.url.replace(/:\/\//, "$&user:pass@") + "/test2/";
    const req = request({ method: "GET", uri }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(req._auth.user, "user");
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBasicRequests, 4);
      done();
    });
  });

  test("POST request", done => {
    const req = request(
      {
        method: "POST",
        form: { key: "value" },
        uri: server.url + "/post/",
        auth: { user: "user", pass: "pass", sendImmediately: false }
      },
      (error, response) => {
        assert.ifError(error);
        assert.deepStrictEqual(req._auth.user, "user");
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(numBasicRequests, 6);
        done();
      }
    );
  });

  test("user - empty string", done => {
    assert.doesNotThrow(() => {
      const req = request(
        {
          method: "GET",
          uri: server.url + "/allow_empty_user/",
          auth: { user: "", pass: "pass", sendImmediately: false }
        },
        (error, response) => {
          assert.ifError(error);
          assert.deepStrictEqual(req._auth.user, "");
          assert.deepStrictEqual(response.statusCode, 200);
          assert.deepStrictEqual(numBasicRequests, 8);
          done();
        }
      );
    });
  });

  test("pass - undefined", done => {
    assert.doesNotThrow(() => {
      const req = request(
        {
          method: "GET",
          uri: server.url + "/allow_undefined_password/",
          auth: { user: "user", pass: undefined, sendImmediately: false }
        },
        (error, response) => {
          assert.ifError(error);
          assert.deepStrictEqual(req._auth.user, "user");
          assert.deepStrictEqual(response.statusCode, 200);
          assert.deepStrictEqual(numBasicRequests, 10);
          done();
        }
      );
    });
  });

  test("pass - utf8", done => {
    assert.doesNotThrow(() => {
      const req = request(
        {
          method: "GET",
          uri: server.url + "/allow_undefined_password/",
          auth: { user: "user", pass: "pâss", sendImmediately: false }
        },
        (error, response) => {
          assert.ifError(error);
          assert.deepStrictEqual(req._auth.user, "user");
          assert.deepStrictEqual(req._auth.pass, "pâss");
          assert.deepStrictEqual(response.statusCode, 200);
          assert.deepStrictEqual(numBasicRequests, 12);
          done();
        }
      );
    });
  });

  test("auth method", done => {
    const req = request
      .get(server.url + "/test/")
      .auth("user", "", false)
      .on("response", response => {
        assert.deepStrictEqual(req._auth.user, "user");
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(numBasicRequests, 14);
        done();
      });
  });

  test("get method", done => {
    const req = request.get(
      server.url + "/test/",
      { auth: { user: "user", pass: "", sendImmediately: false } },
      (error, response) => {
        assert.deepStrictEqual(req._auth.user, "user");
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(numBasicRequests, 16);
        done();
      }
    );
  });

  suiteTeardown(done => server.close(done));
});
