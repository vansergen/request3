const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();
const serverSSL = require("./lib/server").createServer();
const { Agent } = require("http");

const jar = request.jar();
let hits = {};

server.on("/ssl", (request, response) => {
  response.writeHead(302, { location: serverSSL.url + "/" });
  response.end();
});
serverSSL.on("/", (request, response) => {
  response.writeHead(200);
  response.end("SSL");
});

function createRedirectEndpoint(code, label, landing) {
  server.on("/" + label, (request, response) => {
    hits[label] = true;
    response.writeHead(code, {
      location: server.url + "/" + landing,
      "set-cookie": "ham=eggs"
    });
    response.end();
  });
}

function createLandingEndpoint(landing) {
  server.on("/" + landing, (request, response) => {
    // Make sure the cookie doesn't get included twice, see #139:
    // Make sure cookies are set properly after redirect
    assert.strictEqual(request.headers.cookie, "foo=bar; quux=baz; ham=eggs");
    hits[landing] = true;
    response.writeHead(200, {
      "x-response": request.method.toUpperCase() + " " + landing
    });
    response.end(request.method.toUpperCase() + " " + landing);
  });
}

function bouncer(code, label, hops) {
  let hop;
  const landing = label + "_landing";
  let currentLabel;
  let currentLanding;
  hops = hops || 1;

  if (hops === 1) {
    createRedirectEndpoint(code, label, landing);
  } else {
    for (hop = 0; hop < hops; hop++) {
      currentLabel = hop === 0 ? label : label + "_" + (hop + 1);
      currentLanding = hop === hops - 1 ? landing : label + "_" + (hop + 2);

      createRedirectEndpoint(code, currentLabel, currentLanding);
    }
  }
  createLandingEndpoint(landing);
}

suite("Redirect", () => {
  suiteSetup(done =>
    server.listen(0, () => {
      serverSSL.listen(0, () => {
        bouncer(301, "temp");
        bouncer(301, "double", 2);
        bouncer(301, "treble", 3);
        bouncer(302, "perm");
        bouncer(302, "nope");
        bouncer(307, "fwd");
        done();
      });
    })
  );

  test("permanent bounce", done => {
    jar.setCookie("quux=baz", server.url);
    hits = {};
    request(
      { uri: server.url + "/perm", jar, headers: { cookie: "foo=bar" } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.ok(hits.perm, "Original request is to /perm");
        assert.ok(hits.perm_landing, "Forward to permanent landing URL");
        assert.deepStrictEqual(
          body,
          "GET perm_landing",
          "Got permanent landing content"
        );
        done();
      }
    );
  });

  test("preserve HEAD method when using followAllRedirects", done => {
    jar.setCookie("quux=baz", server.url);
    hits = {};
    const headers = { cookie: "foo=bar" };
    const uri = server.url + "/perm";
    request(
      { method: "HEAD", uri, followAllRedirects: true, jar, headers },
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.ok(hits.perm, "Original request is to /perm");
        assert.ok(hits.perm_landing, "Forward to permanent landing URL");
        assert.deepStrictEqual(
          response.headers["x-response"],
          "HEAD perm_landing",
          "Got permanent landing content"
        );
        done();
      }
    );
  });

  test("temporary bounce", done => {
    hits = {};
    const headers = { cookie: "foo=bar" };
    const uri = server.url + "/temp";
    request({ uri, jar, headers }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.ok(hits.temp, "Original request is to /temp");
      assert.ok(hits.temp_landing, "Forward to temporary landing URL");
      assert.deepStrictEqual(
        body,
        "GET temp_landing",
        "Got temporary landing content"
      );
      done();
    });
  });

  test("prevent bouncing", done => {
    hits = {};
    const headers = { cookie: "foo=bar" };
    const uri = server.url + "/nope";
    request({ uri, jar, headers, followRedirect: false }, (error, response) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 302);
      assert.ok(hits.nope, "Original request to /nope");
      assert.ok(!hits.nope_landing, "No chasing the redirect");
      assert.deepStrictEqual(
        response.statusCode,
        302,
        "Response is the bounce itself"
      );
      done();
    });
  });

  test("should not follow post redirects by default", done => {
    hits = {};
    const options = { jar, headers: { cookie: "foo=bar" } };
    request.post(server.url + "/temp", options, (error, response) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 301);
      assert.ok(hits.temp, "Original request is to /temp");
      assert.ok(!hits.temp_landing, "No chasing the redirect when post");
      assert.deepStrictEqual(
        response.statusCode,
        301,
        "Response is the bounce itself"
      );
      done();
    });
  });

  test("should follow post redirects when followallredirects true", done => {
    hits = {};
    const uri = server.url + "/temp";
    request.post(
      { uri, followAllRedirects: true, jar, headers: { cookie: "foo=bar" } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.ok(hits.temp, "Original request is to /temp");
        assert.ok(hits.temp_landing, "Forward to temporary landing URL");
        assert.deepStrictEqual(
          body,
          "GET temp_landing",
          "Got temporary landing content"
        );
        done();
      }
    );
  });

  test("should follow post redirects when followallredirects true and followOriginalHttpMethod is enabled", done => {
    hits = {};
    request.post(
      {
        uri: server.url + "/temp",
        followAllRedirects: true,
        followOriginalHttpMethod: true,
        jar,
        headers: { cookie: "foo=bar" }
      },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.ok(hits.temp, "Original request is to /temp");
        assert.ok(hits.temp_landing, "Forward to temporary landing URL");
        assert.deepStrictEqual(
          body,
          "POST temp_landing",
          "Got temporary landing content"
        );
        done();
      }
    );
  });

  test("should not follow post redirects when followallredirects false", done => {
    hits = {};
    const uri = server.url + "/temp";
    const headers = { cookie: "foo=bar" };
    request.post(
      { uri, followAllRedirects: false, jar, headers },
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 301);
        assert.ok(hits.temp, "Original request is to /temp");
        assert.ok(!hits.temp_landing, "No chasing the redirect");
        assert.deepStrictEqual(
          response.statusCode,
          301,
          "Response is the bounce itself"
        );
        done();
      }
    );
  });

  test("should not follow delete redirects by default", done => {
    hits = {};
    const headers = { cookie: "foo=bar" };
    request.del(server.url + "/temp", { jar, headers }, (error, response) => {
      assert.deepStrictEqual(error, null);
      assert.ok(
        response.statusCode >= 301 && response.statusCode < 400,
        "Status is a redirect"
      );
      assert.ok(hits.temp, "Original request is to /temp");
      assert.ok(!hits.temp_landing, "No chasing the redirect when delete");
      assert.deepStrictEqual(
        response.statusCode,
        301,
        "Response is the bounce itself"
      );
      done();
    });
  });

  test("should not follow delete redirects even if followredirect is set to true", done => {
    hits = {};
    request.del(
      server.url + "/temp",
      { followRedirect: true, jar, headers: { cookie: "foo=bar" } },
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 301);
        assert.ok(hits.temp, "Original request is to /temp");
        assert.ok(!hits.temp_landing, "No chasing the redirect when delete");
        assert.deepStrictEqual(
          response.statusCode,
          301,
          "Response is the bounce itself"
        );
        done();
      }
    );
  });

  test("should follow delete redirects when followallredirects true", done => {
    hits = {};
    request.del(
      server.url + "/temp",
      { followAllRedirects: true, jar, headers: { cookie: "foo=bar" } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.ok(hits.temp, "Original request is to /temp");
        assert.ok(hits.temp_landing, "Forward to temporary landing URL");
        assert.deepStrictEqual(
          body,
          "GET temp_landing",
          "Got temporary landing content"
        );
        done();
      }
    );
  });

  test("should follow 307 delete redirects when followallredirects true", done => {
    hits = {};
    request.del(
      server.url + "/fwd",
      { followAllRedirects: true, jar, headers: { cookie: "foo=bar" } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.ok(hits.fwd, "Original request is to /fwd");
        assert.ok(hits.fwd_landing, "Forward to temporary landing URL");
        assert.deepStrictEqual(
          body,
          "DELETE fwd_landing",
          "Got temporary landing content"
        );
        done();
      }
    );
  });

  test("double bounce", done => {
    hits = {};
    request(
      { uri: server.url + "/double", jar, headers: { cookie: "foo=bar" } },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.ok(hits.double, "Original request is to /double");
        assert.ok(hits.double_2, "Forward to temporary landing URL");
        assert.ok(hits.double_landing, "Forward to landing URL");
        assert.deepStrictEqual(
          body,
          "GET double_landing",
          "Got temporary landing content"
        );
        done();
      }
    );
  });

  test("double bounce terminated after first redirect", done => {
    hits = {};
    const headers = { cookie: "foo=bar" };
    const followRedirect = response =>
      (response.headers.location || "").indexOf("double_2") === -1;
    request(
      { uri: server.url + "/double", jar, headers, followRedirect },
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 301);
        assert.ok(hits.double, "Original request is to /double");
        assert.deepStrictEqual(
          response.headers.location,
          server.url + "/double_2",
          "Current location should be " + server.url + "/double_2"
        );
        done();
      }
    );
  });

  test("triple bounce terminated after second redirect", done => {
    hits = {};
    const followRedirect = response =>
      (response.headers.location || "").indexOf("treble_3") === -1;
    const headers = { cookie: "foo=bar" };
    request(
      { uri: server.url + "/treble", jar, headers, followRedirect },
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 301);
        assert.ok(hits.treble, "Original request is to /treble");
        assert.deepStrictEqual(
          response.headers.location,
          server.url + "/treble_3",
          "Current location should be " + server.url + "/treble_3"
        );
        done();
      }
    );
  });

  test("http to https redirect", done => {
    hits = {};
    request.get(
      { uri: new URL(server.url + "/ssl"), rejectUnauthorized: false },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "SSL", "Got SSL redirect");
        done();
      }
    );
  });

  test("should have referer header by default when following redirect", done => {
    const uri = server.url + "/temp";
    const req = request
      .post(
        { uri, jar, followAllRedirects: true, headers: { cookie: "foo=bar" } },
        (error, response) => {
          assert.deepStrictEqual(error, null);
          assert.deepStrictEqual(response.statusCode, 200);
          done();
        }
      )
      .on("redirect", () => {
        assert.deepStrictEqual(req.headers.referer, server.url + "/temp");
      });
  });

  test("should not have referer header when removeRefererHeader is true", done => {
    const uri = server.url + "/temp";
    const followAllRedirects = true;
    const removeRefererHeader = true;
    const headers = { cookie: "foo=bar" };
    const req = request
      .post(
        { uri, jar, followAllRedirects, removeRefererHeader, headers },
        (error, response) => {
          assert.deepStrictEqual(error, null);
          assert.deepStrictEqual(response.statusCode, 200);
          done();
        }
      )
      .on("redirect", () => {
        assert.deepStrictEqual(req.headers.referer, undefined);
      });
  });

  test("should preserve referer header set in the initial request when removeRefererHeader is true", done => {
    const uri = server.url + "/temp";
    const followAllRedirects = true;
    const removeRefererHeader = true;
    const headers = { cookie: "foo=bar", referer: "http://awesome.com" };
    const req = request
      .post(
        { uri, jar, followAllRedirects, removeRefererHeader, headers },
        (error, response) => {
          assert.deepStrictEqual(error, null);
          assert.deepStrictEqual(response.statusCode, 200);
          done();
        }
      )
      .on("redirect", () => {
        assert.deepStrictEqual(req.headers.referer, "http://awesome.com");
      });
  });

  test("should use same agent class on redirect", done => {
    let agent;
    let calls = 0;
    const agentOptions = {};

    hits = {};
    const uri = server.url + "/temp";
    const headers = { cookie: "foo=bar" };
    class FakeAgent extends Agent {
      constructor(agentOptions) {
        super(agentOptions);
        agent = this;
        const { createConnection } = agent;
        this.createConnection = (...args) => {
          calls++;
          return createConnection.apply(agent, args);
        };
      }
    }
    const req = request.get(
      { uri, jar, headers, agentOptions, agentClass: FakeAgent },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(
          body,
          "GET temp_landing",
          "Got temporary landing content"
        );
        assert.deepStrictEqual(calls, 2);
        assert.ok(
          req.agent === agent,
          "Reinstantiated the user-specified agent"
        );
        assert.ok(req.agentOptions === agentOptions, "Reused agent options");
        done();
      }
    );
  });

  suiteTeardown(done =>
    server.close(() => {
      serverSSL.close(done);
    })
  );
});
