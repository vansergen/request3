const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  numBearerRequests++;
  let ok = false;
  if (request.headers.authorization) {
    ok = request.headers.authorization === "Bearer theToken" ? true : false;
  } else {
    // No auth header, send back WWW-Authenticate header
    ok = false;
    response.setHeader("www-authenticate", 'Bearer realm="Private"');
  }

  if (request.url === "/post/") {
    const expectedContent = "data_key=data_value";
    request.on("data", data => {
      assert.deepStrictEqual(Buffer.from(data).toString(), expectedContent);
    });
    assert.deepStrictEqual(request.method, "POST");
    assert.deepStrictEqual(
      request.headers["content-length"],
      "" + expectedContent.length
    );
    assert.deepStrictEqual(
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

let numBearerRequests = 0;

suite("Bearer authentication", () => {
  suiteSetup(done => server.listen(0, done));

  test("bearer auth", done => {
    const uri = server.url + "/test/";
    const auth = { bearer: "theToken", sendImmediately: false };
    request({ method: "GET", uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBearerRequests, 2);
      done();
    });
  });

  test("bearer auth with default sendImmediately", done => {
    const uri = server.url + "/test2/";
    const auth = { bearer: "theToken" };
    // If we don't set sendImmediately = false, request will send bearer auth
    request({ method: "GET", uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBearerRequests, 3);
      done();
    });
  });

  test("bearer auth with a form", done => {
    const uri = server.url + "/post/";
    const auth = { bearer: "theToken", sendImmediately: false };
    const form = { data_key: "data_value" };
    request({ method: "POST", form, uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBearerRequests, 5);
      done();
    });
  });

  test("using .auth, sendImmediately = false", done => {
    request
      .get(server.url + "/test/")
      .auth(null, null, false, "theToken")
      .on("response", response => {
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(numBearerRequests, 7);
        done();
      });
  });

  test("using .auth, sendImmediately = true", done => {
    request
      .get(server.url + "/test/")
      .auth(null, null, true, "theToken")
      .on("response", response => {
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(numBearerRequests, 8);
        done();
      });
  });

  test("bearer is a function", done => {
    const auth = { bearer: () => "theToken", sendImmediately: false };
    const uri = server.url + "/test/";
    request({ method: "GET", uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBearerRequests, 10);
      done();
    });
  });

  test("bearer is a function, path = test2", done => {
    const auth = { bearer: () => "theToken" };
    const uri = server.url + "/test2/";
    // If we don't set sendImmediately = false, request will send bearer auth
    request({ method: "GET", uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(numBearerRequests, 11);
      done();
    });
  });

  test("no auth method", done => {
    const uri = server.url + "/test2/";
    request({ method: "GET", uri, auth: { bearer: undefined } }, error => {
      assert.deepStrictEqual(error.message, "no auth mechanism defined");
      done();
    });
  });

  test("null bearer", done => {
    const uri = server.url + "/test2/";
    const auth = { bearer: null };
    request({ method: "GET", uri, auth }, (error, response) => {
      assert.ifError(error);
      assert.deepStrictEqual(response.statusCode, 401);
      assert.deepStrictEqual(numBearerRequests, 13);
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
