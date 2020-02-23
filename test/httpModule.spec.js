const http = require("http");
const https = require("https");
const { createServer, createSSLServer } = require("./lib/server");
const assert = require("assert");
const request = require("../index");

suite("httpModule", () => {
  suiteSetup(done =>
    plainServer.listen(0, () => {
      plainServer.on("/plain", (req, res) => {
        res.writeHead(200);
        res.end("plain");
      });
      plainServer.on("/to_https", (req, res) => {
        res.writeHead(301, {
          location: "https://localhost:" + httpsServer.port + "/https"
        });
        res.end();
      });

      httpsServer.listen(0, () => {
        httpsServer.on("/https", (req, res) => {
          res.writeHead(200);
          res.end("https");
        });
        httpsServer.on("/to_plain", (req, res) => {
          res.writeHead(302, {
            location: "http://localhost:" + plainServer.port + "/plain"
          });
          res.end();
        });

        done();
      });
    })
  );

  let fauxRequestsMade;

  function clearFauxRequests() {
    fauxRequestsMade = { http: 0, https: 0 };
  }

  function wrapRequest(name, module) {
    // Just like the http or https module, but note when a request is made.
    const wrapped = {};
    Object.keys(module).forEach(key => {
      const value = module[key];

      if (key === "request") {
        wrapped[key] = (...args) => {
          fauxRequestsMade[name] += 1;
          return value.apply(this, args);
        };
      } else {
        wrapped[key] = value;
      }
    });

    return wrapped;
  }

  const fauxHTTP = wrapRequest("http", http);
  const fauxHTTPS = wrapRequest("https", https);
  const plainServer = createServer();
  const httpsServer = createSSLServer();

  const cases = [
    { name: "undefined" },
    { name: "empty", httpModules: {} },
    { name: "http only", httpModules: { "http:": fauxHTTP } },
    { name: "https only", httpModules: { "https:": fauxHTTPS } },
    {
      name: "http and https",
      httpModules: { "http:": fauxHTTP, "https:": fauxHTTPS }
    }
  ];

  cases.forEach(({ name, httpModules }) => {
    test(name, done => {
      const toHttps = "http://localhost:" + plainServer.port + "/to_https";
      const toPlain = "https://localhost:" + httpsServer.port + "/to_plain";
      const options = { httpModules: httpModules, strictSSL: false };
      const modulesTest = httpModules || {};

      clearFauxRequests();

      request(toHttps, options, (err, res, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.statusCode, 200);
        assert.deepStrictEqual(body, "https", "Received HTTPS server body");

        assert.deepStrictEqual(
          fauxRequestsMade.http,
          modulesTest["http:"] ? 1 : 0
        );
        assert.deepStrictEqual(
          fauxRequestsMade.https,
          modulesTest["https:"] ? 1 : 0
        );

        request(toPlain, options, (err, res, body) => {
          assert.deepStrictEqual(err, null);
          assert.deepStrictEqual(res.statusCode, 200);
          assert.deepStrictEqual(body, "plain", "Received HTTPS server body");

          assert.deepStrictEqual(
            fauxRequestsMade.http,
            modulesTest["http:"] ? 2 : 0
          );
          assert.deepStrictEqual(
            fauxRequestsMade.https,
            modulesTest["https:"] ? 2 : 0
          );

          done();
        });
      });
    });
  });

  suiteTeardown(done => plainServer.close(() => httpsServer.close(done)));
});
