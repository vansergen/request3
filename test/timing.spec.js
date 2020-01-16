const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

const redirectMockTime = 10;

server.on("/", (request, response) => {
  response.writeHead(200);
  response.end("plain");
});
server.on("/redir", (request, response) => {
  // fake redirect delay to ensure strong signal for rollup check
  setTimeout(() => {
    response.writeHead(301, { location: server.url });
    response.end();
  }, redirectMockTime);
});

const { Agent } = require("http");

suite("Timing", () => {
  suiteSetup(done => server.listen(0, done));

  test("non-redirected request is timed", done => {
    const options = { time: true };

    const start = new Date().getTime();
    const req = request(server.url + "/", options, (error, response) => {
      const end = new Date().getTime();

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(typeof response.elapsedTime, "number");
      assert.deepStrictEqual(typeof response.responseStartTime, "number");
      assert.deepStrictEqual(typeof response.timingStart, "number");
      assert.deepStrictEqual(response.timingStart >= start, true);
      assert.deepStrictEqual(typeof response.timings, "object");
      assert.deepStrictEqual(response.elapsedTime > 0, true);
      assert.deepStrictEqual(response.elapsedTime <= end - start, true);
      assert.deepStrictEqual(response.responseStartTime > req.startTime, true);
      assert.deepStrictEqual(response.timings.socket >= 0, true);
      assert.deepStrictEqual(
        response.timings.lookup >= response.timings.socket,
        true
      );
      assert.deepStrictEqual(
        response.timings.connect >= response.timings.lookup,
        true
      );
      assert.deepStrictEqual(
        response.timings.response >= response.timings.connect,
        true
      );
      assert.deepStrictEqual(
        response.timings.end >= response.timings.response,
        true
      );
      assert.deepStrictEqual(typeof response.timingPhases, "object");
      assert.deepStrictEqual(response.timingPhases.wait >= 0, true);
      assert.deepStrictEqual(response.timingPhases.dns >= 0, true);
      assert.deepStrictEqual(response.timingPhases.tcp >= 0, true);
      assert.deepStrictEqual(response.timingPhases.firstByte > 0, true);
      assert.deepStrictEqual(response.timingPhases.download > 0, true);
      assert.deepStrictEqual(response.timingPhases.total > 0, true);
      assert.deepStrictEqual(response.timingPhases.total <= end - start, true);

      // validate there are no unexpected properties
      let propNames = [];
      for (const propName in response.timings) {
        if (Object.prototype.hasOwnProperty.call(response.timings, propName)) {
          propNames.push(propName);
        }
      }
      assert.deepStrictEqual(propNames, [
        "socket",
        "lookup",
        "connect",
        "response",
        "end"
      ]);

      propNames = [];
      for (const propName in response.timingPhases) {
        if (
          Object.prototype.hasOwnProperty.call(response.timingPhases, propName)
        ) {
          propNames.push(propName);
        }
      }
      assert.deepStrictEqual(propNames, [
        "wait",
        "dns",
        "tcp",
        "firstByte",
        "download",
        "total"
      ]);

      done();
    });
  });

  test("redirected request is timed with rollup", done => {
    const options = { time: true };
    const req = request(server.url + "/redir", options, (error, response) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(typeof response.elapsedTime, "number");
      assert.deepStrictEqual(typeof response.responseStartTime, "number");
      assert.deepStrictEqual(response.elapsedTime > 0, true);
      assert.deepStrictEqual(response.responseStartTime > 0, true);
      assert.deepStrictEqual(response.elapsedTime > redirectMockTime, true);
      assert.deepStrictEqual(response.responseStartTime > req.startTime, true);
      done();
    });
  });

  test("keepAlive is timed", done => {
    const agent = new Agent({ keepAlive: true });
    const options = { time: true, agent: agent };
    const start1 = new Date().getTime();
    request(server.url + "/", options, (error, response) => {
      const end1 = new Date().getTime();

      // ensure the first request's timestamps look ok
      assert.deepStrictEqual(response.timingStart >= start1, true);
      assert.deepStrictEqual(start1 <= end1, true);
      assert.deepStrictEqual(response.timings.socket >= 0, true);
      assert.deepStrictEqual(
        response.timings.lookup >= response.timings.socket,
        true
      );
      assert.deepStrictEqual(
        response.timings.connect >= response.timings.lookup,
        true
      );
      assert.deepStrictEqual(
        response.timings.response >= response.timings.connect,
        true
      );

      // open a second request with the same agent so we re-use the same connection
      const start2 = new Date().getTime();
      request(server.url + "/", options, (error, response) => {
        const end2 = new Date().getTime();
        // ensure the second request's timestamps look ok
        assert.deepStrictEqual(response.timingStart >= start2, true);
        assert.deepStrictEqual(start2 <= end2, true);
        // ensure socket==lookup==connect for the second request
        assert.deepStrictEqual(response.timings.socket >= 0, true);
        assert.deepStrictEqual(
          response.timings.lookup,
          response.timings.socket
        );
        assert.deepStrictEqual(
          response.timings.connect,
          response.timings.lookup,
          true
        );
        assert.deepStrictEqual(
          response.timings.response >= response.timings.connect,
          true
        );
        assert.ok(typeof agent.destroy === "function");
        // explicitly shut down the agent
        agent.destroy();
        done();
      });
    });
  });

  suiteTeardown(done => server.close(done));
});
