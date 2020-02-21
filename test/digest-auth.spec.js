const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();
const crypto = require("crypto");

function makeHeader() {
  return [].join.call(arguments, ", ");
}

function makeHeaderRegex() {
  return new RegExp("^" + makeHeader.apply(null, arguments) + "$");
}

function md5(str) {
  return crypto
    .createHash("md5")
    .update(str)
    .digest("hex");
}

server.on("request", (request, response) => {
  let ok, testHeader;

  if (request.url === "/test/") {
    if (request.headers.authorization) {
      testHeader = makeHeaderRegex(
        "Digest username=\"test\"",
        "realm=\"Private\"",
        "nonce=\"WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93\"",
        "uri=\"/test/\"",
        "qop=auth",
        "response=\"[a-f0-9]{32}\"",
        "nc=00000001",
        "cnonce=\"[a-f0-9]{32}\"",
        "algorithm=MD5",
        "opaque=\"5ccc069c403ebaf9f0171e9517f40e41\""
      );
      if (testHeader.test(request.headers.authorization)) {
        ok = true;
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false;
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false;
      response.setHeader(
        "www-authenticate",
        makeHeader(
          "Digest realm=\"Private\"",
          "nonce=\"WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93\"",
          "algorithm=MD5",
          "qop=\"auth\"",
          "opaque=\"5ccc069c403ebaf9f0171e9517f40e41\""
        )
      );
    }
  } else if (request.url === "/test/md5-sess") {
    // RFC 2716 MD5-sess w/ qop=auth
    const user = "test";
    const realm = "Private";
    const pass = "testing";
    const nonce = "WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93";
    const nonceCount = "00000001";
    const qop = "auth";
    const algorithm = "MD5-sess";
    if (request.headers.authorization) {
      // HA1=MD5(MD5(username:realm:password):nonce:cnonce)
      // HA2=MD5(method:digestURI)
      // response=MD5(HA1:nonce:nonceCount:clientNonce:qop:HA2)

      const [, cnonce] = /cnonce="(.*)"/.exec(request.headers.authorization);
      const ha1 = md5(
        md5(user + ":" + realm + ":" + pass) + ":" + nonce + ":" + cnonce
      );
      const ha2 = md5("GET:/test/md5-sess");
      const response = md5(
        ha1 +
          ":" +
          nonce +
          ":" +
          nonceCount +
          ":" +
          cnonce +
          ":" +
          qop +
          ":" +
          ha2
      );

      testHeader = makeHeaderRegex(
        "Digest username=\"" + user + "\"",
        "realm=\"" + realm + "\"",
        "nonce=\"" + nonce + "\"",
        "uri=\"/test/md5-sess\"",
        "qop=" + qop,
        "response=\"" + response + "\"",
        "nc=" + nonceCount,
        "cnonce=\"" + cnonce + "\"",
        "algorithm=" + algorithm
      );

      ok = testHeader.test(request.headers.authorization);
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false;
      response.setHeader(
        "www-authenticate",
        makeHeader(
          "Digest realm=\"" + realm + "\"",
          "nonce=\"" + nonce + "\"",
          "algorithm=" + algorithm,
          "qop=\"" + qop + "\""
        )
      );
    }
  } else if (request.url === "/dir/index.html") {
    // RFC2069-compatible mode
    // check: http://www.rfc-editor.org/errata_search.php?rfc=2069
    if (request.headers.authorization) {
      testHeader = makeHeaderRegex(
        "Digest username=\"Mufasa\"",
        "realm=\"testrealm@host.com\"",
        "nonce=\"dcd98b7102dd2f0e8b11d0f600bfb0c093\"",
        "uri=\"/dir/index.html\"",
        "response=\"[a-f0-9]{32}\"",
        "opaque=\"5ccc069c403ebaf9f0171e9517f40e41\""
      );
      if (testHeader.test(request.headers.authorization)) {
        ok = true;
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false;
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false;
      response.setHeader(
        "www-authenticate",
        makeHeader(
          "Digest realm=\"testrealm@host.com\"",
          "nonce=\"dcd98b7102dd2f0e8b11d0f600bfb0c093\"",
          "opaque=\"5ccc069c403ebaf9f0171e9517f40e41\""
        )
      );
    }
  }

  if (ok) {
    response.statusCode = 200;
    response.end("ok");
  } else {
    response.statusCode = 401;
    response.end("401");
  }
});

suite("Digest auth", () => {
  suiteSetup(done => server.listen(0, done));

  test("with sendImmediately = false", done => {
    let numRedirects = 0;

    const req = request(
      {
        method: "GET",
        uri: server.url + "/test/",
        auth: { user: "test", pass: "testing", sendImmediately: false }
      },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "ok");
        assert.deepStrictEqual(numRedirects, 1);
        done();
      }
    ).on("redirect", () => {
      assert.deepStrictEqual(req.response.statusCode, 401);
      numRedirects++;
    });
  });

  test("with MD5-sess algorithm", done => {
    let numRedirects = 0;

    const req = request(
      {
        method: "GET",
        uri: server.url + "/test/md5-sess",
        auth: { user: "test", pass: "testing", sendImmediately: false }
      },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "ok");
        assert.deepStrictEqual(numRedirects, 1);
        done();
      }
    ).on("redirect", () => {
      assert.deepStrictEqual(req.response.statusCode, 401);
      numRedirects++;
    });
  });

  test("without sendImmediately = false", done => {
    let numRedirects = 0;

    // If we don't set sendImmediately = false, request will send basic auth
    request(
      {
        method: "GET",
        uri: server.url + "/test/",
        auth: { user: "test", pass: "testing" }
      },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 401);
        assert.deepStrictEqual(body, "401");
        assert.deepStrictEqual(numRedirects, 0);
        done();
      }
    ).on("redirect", () => {
      assert.deepStrictEqual(request.response.statusCode, 401);
      numRedirects++;
    });
  });

  test("with different credentials", done => {
    let numRedirects = 0;

    const req = request(
      {
        method: "GET",
        uri: server.url + "/dir/index.html",
        auth: { user: "Mufasa", pass: "CircleOfLife", sendImmediately: false }
      },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "ok");
        assert.deepStrictEqual(numRedirects, 1);
        done();
      }
    ).on("redirect", () => {
      assert.deepStrictEqual(req.response.statusCode, 401);
      numRedirects++;
    });
  });

  suiteTeardown(done => server.close(done));
});
