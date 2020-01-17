const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.statusCode = 200;
  response.end("asdf");
});

suite("Pool", () => {
  suiteSetup(done => server.listen(0, done));

  test("pool=false", done => {
    request({ url: server.url, pool: false }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "asdf");

      const { agent } = response.request;
      assert.deepStrictEqual(agent, false);
      done();
    });
  });

  test("forever", done => {
    const pool = { maxSockets: 1024 };
    const { url } = server;
    const forever = true;
    const req = request({ url, forever, pool }, (error, response, body) => {
      // explicitly shut down the agent
      assert.deepStrictEqual(typeof req.agent.destroy, "function");
      req.agent.destroy();

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, "asdf");

      const { agent } = response.request;
      assert.deepStrictEqual(agent.maxSockets, 1024);
      done();
    });
  });

  test("forever, should use same agent in sequential requests", done => {
    const req = request.defaults({ forever: true });
    const req1 = req(server.url);
    const req2 = req(server.url + "/somepath");
    req1.abort();
    req2.abort();

    assert.deepStrictEqual(typeof req1.agent.destroy, "function");
    req1.agent.destroy();
    assert.deepStrictEqual(typeof req2.agent.destroy, "function");
    req2.agent.destroy();
    assert.deepStrictEqual(req1.agent, req2.agent);
    done();
  });

  test("forever, should use same agent in sequential requests(with pool.maxSockets)", done => {
    const req = request.defaults({ forever: true, pool: { maxSockets: 1024 } });
    const req1 = req(server.url);
    const req2 = req(server.url + "/somepath");
    req1.abort();
    req2.abort();
    assert.deepStrictEqual(typeof req1.agent.destroy, "function");
    req1.agent.destroy();
    assert.deepStrictEqual(typeof req2.agent.destroy, "function");
    req2.agent.destroy();
    assert.deepStrictEqual(req1.agent.maxSockets, 1024);
    assert.deepStrictEqual(req1.agent, req2.agent);
    done();
  });

  test("forever, should use same agent in request() and request.verb", done => {
    const req = request.defaults({ forever: true, pool: { maxSockets: 1024 } });
    const req1 = req(server.url);
    const req2 = req.get(server.url);
    req1.abort();
    req2.abort();
    assert.deepStrictEqual(typeof req1.agent.destroy, "function");
    req1.agent.destroy();
    assert.deepStrictEqual(typeof req2.agent.destroy, "function");
    req2.agent.destroy();
    assert.deepStrictEqual(req1.agent.maxSockets, 1024);
    assert.deepStrictEqual(req1.agent, req2.agent);
    done();
  });

  test("should use different agent if pool option specified", done => {
    const req = request.defaults({ forever: true, pool: { maxSockets: 1024 } });
    const req1 = req(server.url);
    const req2 = req.get({ url: server.url, pool: { maxSockets: 20 } });
    req1.abort();
    req2.abort();
    assert.deepStrictEqual(typeof req1.agent.destroy, "function");
    req1.agent.destroy();
    assert.deepStrictEqual(typeof req2.agent.destroy, "function");
    req2.agent.destroy();
    assert.deepStrictEqual(req1.agent.maxSockets, 1024);
    assert.deepStrictEqual(req2.agent.maxSockets, 20);
    assert.notDeepStrictEqual(req1.agent, req2.agent);
    done();
  });

  suiteTeardown(done => server.close(done));
});
