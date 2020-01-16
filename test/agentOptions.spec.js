// agent.spec.js modifies the process state
// causing these tests to fail when running under single process via tape
delete require.cache[require.resolve("../index")];
delete require.cache[require.resolve("../request")];
const request = require("../index");
const { globalAgent } = require("http");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("/", (request, response) => {
  response.statusCode = 200;
  response.end("");
});

suite("AgentOptions", () => {
  suiteSetup(done => server.listen(0, done));

  test("without agentOptions should use global agent", done => {
    const req = request(server.url, (error, response) => {
      assert.deepStrictEqual(error, null, "No error");
      assert.deepStrictEqual(response.statusCode, 200, "200 status code");
      assert.deepStrictEqual(req.agent, globalAgent, "Global agent");
      assert.deepStrictEqual(Object.keys(req.pool).length, 0);
      done();
    });
  });

  test("with agentOptions should apply to new agent in pool", done => {
    const req = request(
      server.url,
      { agentOptions: { foo: "bar" } },
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(req.agent.options.foo, "bar");
        assert.deepStrictEqual(Object.keys(req.pool).length, 1);
        done();
      }
    );
  });

  suiteTeardown(done => server.close(done));
});
