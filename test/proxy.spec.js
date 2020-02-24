const { createServer } = require("./lib/server");
const request = require("../index");
const assert = require("assert");

const server = createServer();
let currResponseHandler;

["http://google.com/", "https://google.com/"].forEach(url => {
  server.on(url, (req, res) => {
    currResponseHandler(req, res);
    res.writeHeader(200);
    res.end("ok");
  });
});

const proxyEnvVars = [
  "http_proxy",
  "HTTP_PROXY",
  "https_proxy",
  "HTTPS_PROXY",
  "no_proxy",
  "NO_PROXY"
];

suite("Proxy", () => {
  suiteSetup(done => server.listen(0, done));

  const regularCases = [
    [
      "basic proxy",
      {
        proxy: "server.url",
        headers: { "proxy-authorization": "Token Fooblez" }
      },
      req =>
        assert.deepStrictEqual(
          req.headers["proxy-authorization"],
          "Token Fooblez"
        )
    ],
    [
      "proxy auth without uri auth",
      { proxy: "http://user:pass@localhost:" },
      req =>
        assert.deepStrictEqual(
          req.headers["proxy-authorization"],
          "Basic dXNlcjpwYXNz"
        )
    ],
    [
      "HTTP_PROXY environment variable and http: url",
      { env: { HTTP_PROXY: "server.url" } },
      true
    ],
    [
      "http_proxy environment variable and http: url",
      { env: { http_proxy: "server.url" } },
      true
    ],
    [
      "HTTPS_PROXY environment variable and http: url",
      { env: { HTTPS_PROXY: "server.url" } },
      false
    ],
    [
      "https_proxy environment variable and http: url",
      { env: { https_proxy: "server.url" } },
      false
    ],
    [
      "HTTP_PROXY environment variable and https: url",
      {
        env: { HTTP_PROXY: "server.url" },
        url: "https://google.com",
        tunnel: false,
        pool: false
      },
      true
    ],
    [
      "http_proxy environment variable and https: url",
      {
        env: { http_proxy: "server.url" },
        url: "https://google.com",
        tunnel: false
      },
      true
    ],
    [
      "HTTPS_PROXY environment variable and https: url",
      {
        env: { HTTPS_PROXY: "server.url" },
        url: "https://google.com",
        tunnel: false
      },
      true
    ],
    [
      "https_proxy environment variable and https: url",
      {
        env: { https_proxy: "server.url" },
        url: "https://google.com",
        tunnel: false
      },
      true
    ],
    [
      "multiple environment variables and https: url",
      {
        env: { HTTPS_PROXY: "server.url", HTTP_PROXY: "http://localhost:0/" },
        url: "https://google.com",
        tunnel: false
      },
      true
    ],
    [
      "NO_PROXY hostnames are case insensitive",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "GOOGLE.COM" } },
      false
    ],
    [
      "NO_PROXY hostnames are case insensitive 2",
      { env: { http_proxy: "server.url", NO_PROXY: "GOOGLE.COM" } },
      false
    ],
    [
      "NO_PROXY hostnames are case insensitive 3",
      { env: { HTTP_PROXY: "server.url", no_proxy: "GOOGLE.COM" } },
      false
    ],
    [
      "NO_PROXY ignored with explicit proxy passed",
      { env: { NO_PROXY: "*" }, proxy: "server.url" },
      true
    ],
    [
      "NO_PROXY overrides HTTP_PROXY for specific hostname",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "google.com" } },
      false
    ],
    [
      "no_proxy overrides HTTP_PROXY for specific hostname",
      { env: { HTTP_PROXY: "server.url", no_proxy: "google.com" } },
      false
    ],
    [
      "NO_PROXY does not override HTTP_PROXY if no hostnames match",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "foo.bar,bar.foo" } },
      true
    ],
    [
      "NO_PROXY overrides HTTP_PROXY if a hostname matches",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "foo.bar,google.com" } },
      false
    ],
    [
      "NO_PROXY allows an explicit port",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "google.com:80" } },
      false
    ],
    [
      "NO_PROXY only overrides HTTP_PROXY if the port matches",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "google.com:1234" } },
      true
    ],
    [
      "NO_PROXY only overrides HTTP_PROXY if the port matches",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "google.com:1234" } },
      true
    ],
    [
      "NO_PROXY only overrides HTTP_PROXY if the port matches",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "google.com:1234" } },
      true
    ],
    [
      "NO_PROXY=* should override HTTP_PROXY for all hosts",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "*" } },
      false
    ],
    [
      "NO_PROXY should override HTTP_PROXY for all subdomains",
      {
        env: { HTTP_PROXY: "server.url", NO_PROXY: "google.com" },
        headers: { host: "www.google.com" }
      },
      false
    ],
    [
      "NO_PROXY should not override HTTP_PROXY for partial domain matches",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "oogle.com" } },
      true
    ],
    [
      "NO_PROXY with port should not override HTTP_PROXY for partial domain matches",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "oogle.com:80" } },
      true
    ],
    [
      "http_proxy with length of one more than the URL",
      { env: { HTTP_PROXY: "server.url", NO_PROXY: "elgoog1.com" } },
      true
    ],
    [
      "proxy: null should override HTTP_PROXY",
      { env: { HTTP_PROXY: "server.url" }, proxy: null, timeout: 500 },
      false
    ],
    [
      "uri auth without proxy auth",
      { url: "http://user:pass@google.com", proxy: "server.url" },
      req => {
        assert.deepStrictEqual(req.headers["proxy-authorization"], undefined);
        assert.deepStrictEqual(req.headers.authorization, "Basic dXNlcjpwYXNz");
      }
    ]
  ];

  // Should fail: TEST_PROXY_HARNESS=y npm test
  const harnessCases = [
    [
      'should fail with "proxy response should not be called"',
      { proxy: "server.url" },
      false
    ],
    [
      'should fail with "proxy response should be called"',
      { proxy: null },
      true
    ]
  ];

  const cases = process.env.TEST_PROXY_HARNESS ? harnessCases : regularCases;

  cases.forEach(([name, options, responseHandler]) => {
    test(name, done => {
      proxyEnvVars.forEach(v => delete process.env[v]);
      if (options.env) {
        for (const v in options.env) {
          if (options.env[v] === "server.url") {
            options.env[v] = server.url;
          }
          process.env[v] = options.env[v];
        }
        delete options.env;
      }

      if (options.proxy === "server.url") {
        options.proxy = server.url;
      } else if (name === "proxy auth without uri auth") {
        options.proxy += server.port;
      }

      let called = false;
      currResponseHandler = (req, res) => {
        if (responseHandler) {
          called = true;
          assert.deepStrictEqual(req.headers.host, "google.com");
          if (typeof responseHandler === "function") {
            responseHandler(req, res);
          }
        } else {
          assert.fail("proxy response should not be called");
        }
      };

      options.url = options.url || "http://google.com";
      request(options, (err, res, body) => {
        if (responseHandler && !called) {
          assert.fail("proxy response should be called");
        }
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.statusCode, 200);
        if (responseHandler) {
          if (body.length > 100) {
            body = body.substring(0, 100);
          }
          assert.deepStrictEqual(body, "ok");
        } else {
          assert.deepStrictEqual(/^<!doctype html>/i.test(body), true);
        }
        done();
      });
    });
  });

  suiteTeardown(done => server.close(done));
});
