const { createServer } = require("./lib/server");
const request = require("../index");
const util = require("util");
const assert = require("assert");
const { networkInterfaces, platform } = require("os");

const interfaces = networkInterfaces();
const loopbackKeyTest =
  platform() === "win32" ? /Loopback Pseudo-Interface/ : /lo/;
const hasIPv6interface = Object.keys(interfaces).some(name => {
  return (
    loopbackKeyTest.test(name) &&
    interfaces[name].some(info => {
      return info.family === "IPv6";
    })
  );
});

const server = createServer();

const jar = request.jar();
const jar2 = request.jar();

suite("Headers", () => {
  suiteSetup(done => {
    server.listen(0, () => {
      jar.setCookie("quux=baz", server.url);
      jar2.setCookie("quux=baz; Domain=foo.bar.com", server.url, {
        ignoreError: true
      });

      server.on("/redirect/from", (req, res) => {
        res.writeHead(301, { location: "/redirect/to" });
        res.end();
      });
      server.on("/redirect/to", (req, res) => res.end("ok"));
      server.on("/headers.json", (req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(req.headers));
      });
      done();
    });
  });

  const cases = [
    {
      name: "#125: headers.cookie with no cookie jar",
      path: "no-jar",
      requestObj: { headers: { cookie: "foo=bar" } },
      serverAssertFn: req =>
        assert.deepStrictEqual(req.headers.cookie, "foo=bar")
    },
    {
      name: "#125: headers.cookie + cookie jar",
      path: "header-and-jar",
      requestObj: { jar: jar, headers: { cookie: "foo=bar" } },
      serverAssertFn: req =>
        assert.deepStrictEqual(req.headers.cookie, "foo=bar; quux=baz")
    },
    {
      name: "#794: ignore cookie parsing and domain errors",
      path: "ignore-errors",
      requestObj: { jar: jar2, headers: { cookie: "foo=bar" } },
      serverAssertFn: req =>
        assert.deepStrictEqual(req.headers.cookie, "foo=bar")
    },
    {
      name: "#784: override content-type when json is used",
      path: "json",
      requestObj: {
        json: true,
        method: "POST",
        headers: { "content-type": "application/json; charset=UTF-8" },
        body: { hello: "my friend" }
      },
      serverAssertFn: req =>
        assert.deepStrictEqual(
          req.headers["content-type"],
          "application/json; charset=UTF-8"
        )
    },
    {
      name: "neither headers.cookie nor a cookie jar is specified",
      path: "no-cookie",
      requestObj: {},
      serverAssertFn: req =>
        assert.deepStrictEqual(req.headers.cookie, undefined)
    }
  ];

  cases.forEach(({ name, path, requestObj, serverAssertFn }) => {
    test(name, done => {
      server.on("/" + path, (req, res) => {
        serverAssertFn(req, res);
        res.writeHead(200);
        res.end();
      });
      requestObj.url = server.url + "/" + path;
      request(requestObj, (err, res) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.statusCode, 200);
        done();
      });
    });
  });

  test("upper-case Host header and redirect", done => {
    // Horrible hack to observe the raw data coming to the server (before Node
    // core lower-cases the headers)
    let rawData = "";
    let _ondata;

    server.on("connection", socket => {
      if (socket.ondata) {
        _ondata = socket.ondata;
      }
      function handledata(d, start, end) {
        if (_ondata) {
          rawData += d.slice(start, end).toString();
          return _ondata.apply(this, arguments);
        } else {
          rawData += d;
        }
      }
      socket.on("data", handledata);
      socket.ondata = handledata;
    });

    function checkHostHeader(host) {
      assert.ok(
        new RegExp("^Host: " + host + "$", "m").test(rawData),
        util.format(
          'Expected "Host: %s" in data "%s"',
          host,
          rawData.trim().replace(/\r?\n/g, "\\n")
        )
      );
      rawData = "";
    }

    let redirects = 0;
    const req = request(
      { url: server.url + "/redirect/from", headers: { Host: "127.0.0.1" } },
      (err, res, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.statusCode, 200);
        assert.deepStrictEqual(body, "ok");
        assert.deepStrictEqual(redirects, 1);
        // XXX should the host header change like this after a redirect?
        checkHostHeader("localhost:" + server.port);
        done();
      }
    ).on("redirect", () => {
      redirects++;
      assert.deepStrictEqual(req.uri.href, server.url + "/redirect/to");
      checkHostHeader("127.0.0.1");
    });
  });

  test("undefined headers", done => {
    request(
      {
        url: server.url + "/headers.json",
        headers: { "X-TEST-1": "test1", "X-TEST-2": undefined },
        json: true
      },
      (err, res, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(body["x-test-1"], "test1");
        assert.deepStrictEqual(body["x-test-2"], undefined);
        done();
      }
    );
  });

  test("preserve port in host header if non-standard port", done => {
    const r = request({ url: server.url + "/headers.json" }, err => {
      assert.deepStrictEqual(err, null);
      assert.deepStrictEqual(r.originalHost, "localhost:" + server.port);
      done();
    });
  });

  test("strip port in host header if explicit standard port (:80) & protocol (HTTP)", done => {
    const r = request({ url: "http://localhost:80/headers.json" }, () => {
      assert.deepStrictEqual(r.req.socket._host, "localhost");
      done();
    });
  });

  test("strip port in host header if explicit standard port (:443) & protocol (HTTPS)", done => {
    const r = request({ url: "https://localhost:443/headers.json" }, () => {
      assert.deepStrictEqual(r.req.socket._host, "localhost");
      done();
    });
  });

  test("strip port in host header if implicit standard port & protocol (HTTP)", done => {
    const r = request({ url: "http://localhost/headers.json" }, () => {
      assert.deepStrictEqual(r.req.socket._host, "localhost");
      done();
    });
  });

  test("strip port in host header if implicit standard port & protocol (HTTPS)", done => {
    const r = request({ url: "https://localhost/headers.json" }, () => {
      assert.deepStrictEqual(r.req.socket._host, "localhost");
      done();
    });
  });

  const isExpectedHeaderCharacterError = (headerName, err) =>
    err.message === "The header content contains invalid characters" ||
    err.message ===
      'Invalid character in header content ["' + headerName + '"]';

  test("catch invalid characters error - GET", done => {
    request(
      { url: server.url + "/headers.json", headers: { test: "אבגד" } },
      err => assert.ok(isExpectedHeaderCharacterError("test", err))
    ).on("error", err => {
      assert.ok(isExpectedHeaderCharacterError("test", err));
      done();
    });
  });

  test("catch invalid characters error - POST", done => {
    request(
      {
        method: "POST",
        url: server.url + "/headers.json",
        headers: { test: "אבגד" },
        body: "beep"
      },
      err => assert.ok(isExpectedHeaderCharacterError("test", err))
    ).on("error", err => {
      assert.ok(isExpectedHeaderCharacterError("test", err));
      done();
    });
  });

  if (hasIPv6interface) {
    test("IPv6 Host header", done => {
      // Horrible hack to observe the raw data coming to the server
      let rawData = "";
      let _ondata;

      server.on("connection", socket => {
        if (socket.ondata) {
          _ondata = socket.ondata;
        }
        function handledata(d, start, end) {
          if (_ondata) {
            rawData += d.slice(start, end).toString();
            return _ondata.apply(this, arguments);
          } else {
            rawData += d;
          }
        }
        socket.on("data", handledata);
        socket.ondata = handledata;
      });

      function checkHostHeader(host) {
        assert.ok(
          new RegExp("^Host: " + host + "$", "im").test(rawData),
          util.format(
            'Expected "Host: %s" in data "%s"',
            host,
            rawData.trim().replace(/\r?\n/g, "\\n")
          )
        );
        rawData = "";
      }

      const url = new URL(server.url);
      url.hostname = "[::1]";
      request({ url: url.href + "headers.json" }, (err, res) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.statusCode, 200);
        checkHostHeader("\\[::1\\]:" + server.port);
        done();
      });
    });
  }

  suiteTeardown(done => server.close(done));
});
