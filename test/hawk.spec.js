const request = require("../index");
const hawk = require("../lib/hawk");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  if (!request.headers.authorization) {
    return response.end("FAIL");
  }

  const headerParts = request.headers.authorization.match(
    /^(\w+)(?:\s+(.*))?$/
  );
  assert.strictEqual(headerParts[1], "Hawk");
  const attributes = {};
  headerParts[2].replace(/(\w+)="([^"\\]*)"\s*(?:,\s*|$)/g, ($0, $1, $2) => {
    attributes[$1] = $2;
  });
  const hostParts = request.headers.host.split(":");

  const artifacts = {
    method: request.method,
    host: hostParts[0],
    port: hostParts[1]
      ? hostParts[1]
      : request.connection && request.connection.encrypted
      ? 443
      : 80,
    resource: request.url,
    ts: attributes.ts,
    nonce: attributes.nonce,
    hash: attributes.hash,
    ext: attributes.ext,
    app: attributes.app,
    dlg: attributes.dlg,
    mac: attributes.mac,
    id: attributes.id
  };

  assert.strictEqual(attributes.id, "dh37fgj492je");
  const credentials = {
    key: "werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn",
    algorithm: "sha256",
    user: "Steve"
  };

  const mac = hawk.calculateMac(credentials, artifacts);
  assert.strictEqual(mac, attributes.mac);
  response.end("OK");
});

const creds = {
  key: "werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn",
  algorithm: "sha256",
  id: "dh37fgj492je"
};

suite("HAWK", () => {
  suiteSetup(done => server.listen(0, done));

  test("get", done => {
    const hawk = { credentials: creds };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "OK");
      done();
    });
  });

  test("post", done => {
    const hawk = { credentials: creds, payload: "hello" };
    const { url } = server;
    request.post({ url, body: "hello", hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "OK");
      done();
    });
  });

  test("ext", done => {
    const hawk = { credentials: creds, ext: "test" };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "OK");
      done();
    });
  });

  test("app", done => {
    const hawk = { credentials: creds, app: "test" };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "OK");
      done();
    });
  });

  test("app+dlg", done => {
    const hawk = { credentials: creds, app: "test", dlg: "asd" };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "OK");
      done();
    });
  });

  test("missing-creds", done => {
    request(server.url, { hawk: {} }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "FAIL");
      done();
    });
  });

  test("missing-creds-id", done => {
    const hawk = { credentials: {} };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "FAIL");
      done();
    });
  });

  test("missing-creds-key", done => {
    const hawk = { credentials: { id: "asd" } };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "FAIL");
      done();
    });
  });

  test("missing-creds-algo", done => {
    const hawk = { credentials: { key: "123", id: "123" } };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "FAIL");
      done();
    });
  });

  test("invalid-creds-algo", done => {
    const hawk = { credentials: { key: "123", id: "123", algorithm: "xx" } };
    request(server.url, { hawk }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "FAIL");
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
