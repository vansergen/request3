const request = require("../index");
const assert = require("assert");
const { EventEmitter } = require("events");
const server1 = require("./lib/server").createServer();
const server2 = require("./lib/server").createServer();
const emitter = new EventEmitter();

const connections = [];

function bouncy(server, url) {
  const redirs = { a: "b", b: "c", c: "d", d: "e", e: "f", f: "g", g: "end" };
  server.on("connection", socket => connections.push(socket));
  let perm = true;
  Object.keys(redirs).forEach(p => {
    const t = redirs[p];
    // switch type each time
    const type = perm ? 301 : 302;
    perm = !perm;
    server.on("/" + p, (request, response) => {
      setTimeout(() => {
        response.writeHead(type, { location: url + "/" + t });
        response.end();
      }, Math.round(Math.random() * 10));
    });
  });

  server.on("/end", (request, response) => {
    const key = request.headers["x-test-key"];
    emitter.emit("hit-" + key, key);
    response.writeHead(200);
    response.end(key);
  });
}

suite("Redirect (complex)", () => {
  suiteSetup(done => {
    server1.listen(0, () => {
      server2.listen(0, () => {
        bouncy(server1, server2.url);
        bouncy(server2, server1.url);
        done();
      });
    });
  });

  teardown(() =>
    connections.forEach(socket => socket.destroyed || socket.destroy())
  );

  test("lots of redirects", done => {
    const n = 10;
    let num = 0;
    const redirect = i => {
      const key = "test_" + i;
      const uri = (i % 2 ? server1.url : server2.url) + "/a";
      const headers = { "x-test-key": key };
      const rejectUnauthorized = false;
      request({ uri, headers, rejectUnauthorized }, (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, key);
        ++num === 20 ? done() : false;
      });

      emitter.once("hit-" + key, v => {
        assert.deepStrictEqual(v, key);
        ++num === 20 ? done() : false;
      });
    };
    for (let i = 0; i < n; i++) {
      redirect(i);
    }
  });

  suiteTeardown(done => {
    server1.close(() => {
      server2.close(done);
    });
  });
});
