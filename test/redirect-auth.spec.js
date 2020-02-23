const { createServer, createSSLServer } = require("./lib/server");
const util = require("util");
const assert = require("assert");
const request = require("../index").defaults({
  auth: { user: "test", pass: "testing" },
  rejectUnauthorized: false
});

const s = createServer();
const ss = createSSLServer();

// redirect.from(proto, host).to(proto, host) returns an object with keys:
//   src : source URL
//   dst : destination URL
const redirect = {
  from: (fromProto, fromHost) => ({
    to: (toProto, toHost) => {
      const fromPort = fromProto === "http" ? s.port : ss.port;
      const toPort = toProto === "http" ? s.port : ss.port;
      return {
        src: util.format(
          "%s://%s:%d/to/%s/%s",
          fromProto,
          fromHost,
          fromPort,
          toProto,
          toHost
        ),
        dst: util.format(
          "%s://%s:%d/from/%s/%s",
          toProto,
          toHost,
          toPort,
          fromProto,
          fromHost
        )
      };
    }
  })
};

const handleRequests = srv => {
  ["http", "https"].forEach(proto => {
    ["localhost", "127.0.0.1"].forEach(host => {
      srv.on(util.format("/to/%s/%s", proto, host), (req, res) => {
        const r = redirect
          .from(srv.protocol, req.headers.host.split(":")[0])
          .to(proto, host);
        res.writeHead(301, {
          location: r.dst
        });
        res.end();
      });

      srv.on(util.format("/from/%s/%s", proto, host), (req, res) =>
        res.end("auth: " + (req.headers.authorization || "(nothing)"))
      );
    });
  });
};

suite("Redirect auth", () => {
  suiteSetup(done =>
    s.listen(0, () =>
      ss.listen(0, () => {
        handleRequests(s);
        handleRequests(ss);
        done();
      })
    )
  );

  const cases = [
    {
      name: "same host and protocol",
      redir: ["http", "localhost", "http", "localhost"],
      expectAuth: true
    },
    {
      name: "same host different protocol",
      redir: ["http", "localhost", "https", "localhost"],
      expectAuth: true
    },
    {
      name: "different host same protocol",
      redir: ["https", "127.0.0.1", "https", "localhost"],
      expectAuth: false
    },
    {
      name: "different host and protocol",
      redir: ["http", "localhost", "https", "127.0.0.1"],
      expectAuth: false
    }
  ];

  cases.forEach(({ name, redir, expectAuth }) => {
    test("redirect to " + name, done => {
      const [fromProto, fromHost, toProto, toHost] = redir;
      const { src, dst } = redirect
        .from(fromProto, fromHost)
        .to(toProto, toHost);
      request(src, (err, res, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.request.uri.href, dst);
        assert.deepStrictEqual(res.statusCode, 200);
        assert.deepStrictEqual(
          body,
          expectAuth ? "auth: Basic dGVzdDp0ZXN0aW5n" : "auth: (nothing)"
        );
        done();
      });
    });
  });

  test("redirect URL helper", done => {
    assert.deepStrictEqual(
      redirect.from("http", "localhost").to("https", "127.0.0.1"),
      {
        src: util.format("http://localhost:%d/to/https/127.0.0.1", s.port),
        dst: util.format("https://127.0.0.1:%d/from/http/localhost", ss.port)
      }
    );
    assert.deepStrictEqual(
      redirect.from("https", "localhost").to("http", "localhost"),
      {
        src: util.format("https://localhost:%d/to/http/localhost", ss.port),
        dst: util.format("http://localhost:%d/from/https/localhost", s.port)
      }
    );
    done();
  });

  suiteTeardown(done => s.close(() => ss.close(done)));
});
