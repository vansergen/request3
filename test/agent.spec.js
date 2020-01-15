const request = require("../index");
const http = require("http");
const assert = require("assert");

const server = http.createServer((request, response) => {
  response.statusCode = 200;
  response.end();
});

suite("Agent", () => {
  suiteSetup(done =>
    server.listen(0, function() {
      server.port = this.address().port;
      server.url = "http://localhost:" + server.port;
      done();
    })
  );

  test("options.agent", done => {
    const agent = new http.Agent({ keepAlive: true });
    const req = request({ uri: server.url, agent }, error => {
      assert.deepStrictEqual(error, null, "No error");
      assert.ok(req.agent instanceof http.Agent, "is http.Agent");
      assert.deepStrictEqual(req.agent.options.keepAlive, true, "is keepAlive");

      const name = req.agent.getName({ port: server.port });
      const { length } = req.agent.sockets[name];
      assert.deepStrictEqual(length, 1, "1 open socket");

      const [socket] = req.agent.sockets[name];

      socket.on("close", () => {
        const { length } = Object.keys(req.agent.sockets);
        assert.equal(length, 0, "0 open sockets");
        done();
      });
      socket.end();
    });
  });

  test("options.agentClass + options.agentOptions", done => {
    const agent = new http.Agent({ keepAlive: true });
    const agentOptions = { keepAlive: true };
    const req = request({ uri: server.url, agent, agentOptions }, error => {
      assert.deepStrictEqual(error, null, "No error");
      assert.ok(req.agent instanceof http.Agent, "is http.Agent");
      assert.deepStrictEqual(req.agent.options.keepAlive, true, "is keepAlive");

      const name = req.agent.getName({ port: server.port });
      const { length } = req.agent.sockets[name];
      assert.deepStrictEqual(length, 1, "1 open socket");

      const [socket] = req.agent.sockets[name];

      socket.on("close", () => {
        const { length } = Object.keys(req.agent.sockets);
        assert.equal(length, 0, "0 open sockets");
        done();
      });
      socket.end();
    });
  });

  test("options.forever = true", done => {
    const req = request({ uri: server.url, forever: true }, error => {
      assert.deepStrictEqual(error, null, "No error");
      assert.ok(req.agent instanceof http.Agent, "is http.Agent");
      assert.deepStrictEqual(req.agent.options.keepAlive, true, "is keepAlive");

      const name = req.agent.getName({ port: server.port });
      const { length } = req.agent.sockets[name];
      assert.deepStrictEqual(length, 1, "1 open socket");

      const [socket] = req.agent.sockets[name];

      socket.on("close", () => {
        const { length } = Object.keys(req.agent.sockets);
        assert.equal(length, 0, "0 open sockets");
        done();
      });
      socket.end();
    });
  });

  test("forever() method", done => {
    const _request = request.forever({ maxSockets: 1 });
    const req = _request({ uri: server.url }, error => {
      assert.deepStrictEqual(error, null, "No error");
      assert.ok(req.agent instanceof http.Agent, "is http.Agent");
      assert.deepStrictEqual(req.agent.options.keepAlive, true, "is keepAlive");

      const name = req.agent.getName({ port: server.port });
      const { length } = req.agent.sockets[name];
      assert.deepStrictEqual(length, 1, "1 open socket");

      const [socket] = req.agent.sockets[name];

      socket.on("close", () => {
        const { length } = Object.keys(req.agent.sockets);
        assert.equal(length, 0, "0 open sockets");
        done();
      });
      socket.end();
    });
  });

  suiteTeardown(done => server.close(done));
});
