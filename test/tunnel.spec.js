const { createServer, createSSLServer } = require("./lib/server");
const assert = require("assert");
const request = require("../index");
const https = require("https");
const net = require("net");
const fs = require("fs");
const path = require("path");
const util = require("util");

let events = [];
const caFile = path.resolve(__dirname, "ssl/ca/ca.crt");
const ca = fs.readFileSync(caFile);
const clientCert = fs.readFileSync(
  path.resolve(__dirname, "ssl/ca/client.crt")
);
const clientKey = fs.readFileSync(
  path.resolve(__dirname, "ssl/ca/client-enc.key")
);
const clientPassword = "password";
const sslOpts = {
  key: path.resolve(__dirname, "ssl/ca/localhost.key"),
  cert: path.resolve(__dirname, "ssl/ca/localhost.crt")
};

const mutualSSLOpts = {
  key: path.resolve(__dirname, "ssl/ca/localhost.key"),
  cert: path.resolve(__dirname, "ssl/ca/localhost.crt"),
  ca: caFile,
  requestCert: true,
  rejectUnauthorized: true
};

// this is needed for 'https over http, tunnel=false' test
// from https://github.com/coolaj86/node-ssl-root-cas/blob/v1.1.9-beta/ssl-root-cas.js#L4267-L4281
const httpsOpts = https.globalAgent.options;
httpsOpts.ca = httpsOpts.ca || [];
httpsOpts.ca.push(ca);

const s = createServer();
const ss = createSSLServer(sslOpts);
const ss2 = createSSLServer(mutualSSLOpts);

function event() {
  events.push(util.format.apply(null, arguments));
}

const connections = [];

function setListeners(server, type) {
  server.on("connection", socket => connections.push(socket));

  server.on("/", (req, res) => {
    event("%s response", type);
    res.end(type + " ok");
  });

  server.on("request", (req, res) => {
    if (/^https?:/.test(req.url)) {
      // This is a proxy request
      let [dest] = req.url.split(":");
      // Is it a redirect?
      const match = req.url.match(/\/redirect\/(https?)$/);
      if (match) {
        dest += "->" + match[1];
      }
      event("%s proxy to %s", type, dest);
      request(req.url, { followRedirect: false }).pipe(res);
    }
  });

  server.on("/redirect/http", (req, res) => {
    event("%s redirect to http", type);
    res.writeHead(301, { location: s.url });
    res.end();
  });

  server.on("/redirect/https", (req, res) => {
    event("%s redirect to https", type);
    res.writeHead(301, { location: ss.url });
    res.end();
  });

  server.on("connect", (req, client, head) => {
    const [, port] = req.url.split(":");
    const server = net.connect(port, () => {
      event("%s connect to %s", type, req.url);
      client.write("HTTP/1.1 200 Connection established\r\n\r\n");
      client.pipe(server);
      server.write(head);
      server.pipe(client);
    });
  });
}

// monkey-patch since you can't set a custom certificate authority for the
// proxy in tunnel-agent (this is necessary for "* over https" tests)
let customCaCount = 0;
const httpsRequestOld = https.request;
https.request = options => {
  if (customCaCount) {
    options.ca = ca;
    customCaCount--;
  }
  return httpsRequestOld.apply(this, [options]);
};

function formatExpected(messages, port1, port2) {
  const formatted = [...messages];
  if (port2) {
    formatted[2] += `${port2}`;
  }
  if (port1) {
    formatted[0] += `${port1}`;
  }
  return formatted;
}

suite("Tunnel", () => {
  suiteSetup(done => {
    setListeners(s, "http");
    setListeners(ss, "https");
    setListeners(ss2, "https");

    s.listen(0, () => {
      ss.listen(0, () => {
        ss2.listen(0, "localhost", done);
      });
    });
  });

  teardown(() => {
    connections.forEach(socket => socket.destroyed || socket.destroy());
  });

  const cases = [
    // HTTP OVER HTTP
    [
      "http over http, tunnel=true",
      { server: s, url: "", proxy: s, tunnel: true },
      ["http connect to localhost:", "http response", "200 http ok"],
      s
    ],
    [
      "http over http, tunnel=false",
      { server: s, url: "", proxy: s, tunnel: false },
      ["http proxy to http", "http response", "200 http ok"]
    ],
    [
      "http over http, tunnel=default",
      { server: s, url: "", proxy: s },
      ["http proxy to http", "http response", "200 http ok"]
    ],
    // HTTP OVER HTTPS
    [
      "http over https, tunnel=true",
      { server: s, url: "", proxy: ss, tunnel: true },
      ["https connect to localhost:", "http response", "200 http ok"],
      s
    ],
    [
      "http over https, tunnel=false",
      { server: s, url: "", proxy: ss, tunnel: false },
      ["https proxy to http", "http response", "200 http ok"]
    ],
    [
      "http over https, tunnel=default",
      { server: s, url: "", proxy: ss },
      ["https proxy to http", "http response", "200 http ok"]
    ],
    // HTTPs OVER HTTP
    [
      "https over http, tunnel=true",
      { server: ss, url: "", proxy: s, tunnel: true },
      ["http connect to localhost:", "https response", "200 https ok"],
      ss
    ],
    [
      "https over http, tunnel=false",
      { server: ss, url: "", proxy: s, tunnel: false },
      ["http proxy to https", "https response", "200 https ok"]
    ],
    [
      "https over http, tunnel=default",
      { server: ss, url: "", proxy: s },
      ["http connect to localhost:", "https response", "200 https ok"],
      ss
    ],
    // HTTPS OVER HTTPS
    [
      "https over https, tunnel=true",
      { server: ss, url: "", proxy: ss, tunnel: true },
      ["https connect to localhost:", "https response", "200 https ok"],
      ss
    ],
    [
      "https over https, tunnel=false",
      { server: ss, url: "", proxy: ss, tunnel: false, pool: false },
      ["https proxy to https", "https response", "200 https ok"]
    ],
    [
      "https over https, tunnel=default",
      { server: ss, url: "", proxy: ss },
      ["https connect to localhost:", "https response", "200 https ok"],
      ss
    ],
    // HTTP->HTTP OVER HTTP
    [
      "http->http over http, tunnel=true",
      { server: s, url: "/redirect/http", proxy: s, tunnel: true },
      [
        "http connect to localhost:",
        "http redirect to http",
        "http connect to localhost:",
        "http response",
        "200 http ok"
      ],
      s,
      s
    ],
    [
      "http->http over http, tunnel=false",
      { server: s, url: "/redirect/http", proxy: s, tunnel: false },
      [
        "http proxy to http->http",
        "http redirect to http",
        "http proxy to http",
        "http response",
        "200 http ok"
      ]
    ],
    [
      "http->http over http, tunnel=default",
      { server: s, url: "/redirect/http", proxy: s },
      [
        "http proxy to http->http",
        "http redirect to http",
        "http proxy to http",
        "http response",
        "200 http ok"
      ]
    ],
    // HTTP->HTTPS OVER HTTP
    [
      "http->https over http, tunnel=true",
      { server: s, url: "/redirect/https", proxy: s, tunnel: true },
      [
        "http connect to localhost:",
        "http redirect to https",
        "http connect to localhost:",
        "https response",
        "200 https ok"
      ],
      s,
      ss
    ],
    [
      "http->https over http, tunnel=false",
      { server: s, url: "/redirect/https", proxy: s, tunnel: false },
      [
        "http proxy to http->https",
        "http redirect to https",
        "http proxy to https",
        "https response",
        "200 https ok"
      ]
    ],
    [
      "http->https over http, tunnel=default",
      { server: s, url: "/redirect/https", proxy: s },
      [
        "http proxy to http->https",
        "http redirect to https",
        "http connect to localhost:",
        "https response",
        "200 https ok"
      ],
      undefined,
      ss
    ],
    // HTTPS->HTTP OVER HTTP
    [
      "https->http over http, tunnel=true",
      { server: ss, url: "/redirect/http", proxy: s, tunnel: true },
      [
        "http connect to localhost:",
        "https redirect to http",
        "http connect to localhost:",
        "http response",
        "200 http ok"
      ],
      ss,
      s
    ],
    [
      "https->http over http, tunnel=false",
      { server: ss, url: "/redirect/http", proxy: s, tunnel: false },
      [
        "http proxy to https->http",
        "https redirect to http",
        "http proxy to http",
        "http response",
        "200 http ok"
      ]
    ],
    [
      "https->http over http, tunnel=default",
      { server: ss, url: "/redirect/http", proxy: s },
      [
        "http connect to localhost:",
        "https redirect to http",
        "http proxy to http",
        "http response",
        "200 http ok"
      ],
      ss
    ],
    // HTTPS->HTTPS OVER HTTP
    [
      "https->https over http, tunnel=true",
      { server: ss, url: "/redirect/https", proxy: s, tunnel: true },
      [
        "http connect to localhost:",
        "https redirect to https",
        "http connect to localhost:",
        "https response",
        "200 https ok"
      ],
      ss,
      ss
    ],
    [
      "https->https over http, tunnel=false",
      { server: ss, url: "/redirect/https", proxy: s, tunnel: false },
      [
        "http proxy to https->https",
        "https redirect to https",
        "http proxy to https",
        "https response",
        "200 https ok"
      ]
    ],
    [
      "https->https over http, tunnel=default",
      { server: ss, url: "/redirect/https", proxy: s },
      [
        "http connect to localhost:",
        "https redirect to https",
        "http connect to localhost:",
        "https response",
        "200 https ok"
      ],
      ss,
      ss
    ],
    // MUTUAL HTTPS OVER HTTP
    [
      "mutual https over http, tunnel=true",
      {
        server: ss2,
        url: "",
        proxy: s,
        tunnel: true,
        cert: clientCert,
        key: clientKey,
        passphrase: clientPassword
      },
      ["http connect to localhost:", "https response", "200 https ok"],
      ss2
    ],
    [
      "mutual https over http, tunnel=default",
      {
        server: ss2,
        url: "",
        proxy: s,
        cert: clientCert,
        key: clientKey,
        passphrase: clientPassword
      },
      ["http connect to localhost:", "https response", "200 https ok"],
      ss2
    ]
    /* XXX causes 'Error: socket hang up'
    [
      "mutual https over http, tunnel=false",
      {
        server: ss2,
        url: "",
        proxy: s,
        tunnel: false,
        cert: clientCert,
        key: clientKey,
        passphrase: clientPassword
      },
      ["http connect to localhost:", "https response", "200 https ok"],
      ss2
    ]
    */
  ];

  cases.forEach(([name, { server, url, proxy, ...opts }, expected, p1, p2]) => {
    test(name, done => {
      url = server.url + url;
      opts.ca = ca;
      proxy = proxy.url;
      if (proxy === ss.url) {
        customCaCount = url === ss.url ? 2 : 1;
      }
      p1 = p1 ? p1.port : undefined;
      p2 = p2 ? p2.port : undefined;
      request({ url, proxy, ...opts }, (err, res, body) => {
        event(err ? "err " + err.message : res.statusCode + " " + body);
        const formatted = formatExpected(expected, p1, p2);
        assert.deepStrictEqual(events, formatted);
        events = [];
        done();
      });
    });
  });

  suiteTeardown(done => {
    ss2.close(() => ss.close(() => s.close(done)));
  });
});
