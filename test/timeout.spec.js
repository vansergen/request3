const request = require("../index");
const assert = require("assert");
const { Agent } = require("http");
const server = require("./lib/server").createServer();

// Request that waits for 100ms
server.on("request", (request, response) => {
  setTimeout(() => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.write("waited");
    response.end();
  }, 100);
});

function checkErrCode(error) {
  assert.notDeepStrictEqual(error, null);
  assert.ok(
    error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT",
    "Error ETIMEDOUT or ESOCKETTIMEDOUT"
  );
}

function checkEventHandlers(socket) {
  const connectListeners = socket.listeners("connect");
  let found = false;
  for (let i = 0; i < connectListeners.length; ++i) {
    const fn = connectListeners[i];
    if (typeof fn === "function" && fn.name === "onReqSockConnect") {
      found = true;
      break;
    }
  }
  assert.ok(!found, "Connect listener should not exist");
}

// We need a destination that will not immediately return a TCP Reset
// packet. StackOverflow suggests these hosts:
// (https://stackoverflow.com/a/904609/329700)
const nonRoutable = [
  "10.255.255.1",
  "10.0.0.0",
  "192.168.0.0",
  "192.168.255.255",
  "172.16.0.0",
  "172.31.255.255"
];
let nrIndex = 0;
function getNonRoutable() {
  const ip = nonRoutable[nrIndex];
  if (!ip) {
    throw new Error("No more non-routable addresses");
  }
  ++nrIndex;
  return ip;
}

suite("Timeout", () => {
  suiteSetup(done => server.listen(0, done));

  test("timeout", done => {
    const shouldTimeout = { url: server.url + "/timeout", timeout: 50 };

    request(shouldTimeout, error => {
      checkErrCode(error);
      done();
    });
  });

  test("set connect to false", done => {
    const shouldTimeout = { url: server.url + "/timeout", timeout: 50 };
    request(shouldTimeout, error => {
      checkErrCode(error);
      assert.deepStrictEqual(
        error.connect,
        false,
        "Read Timeout Error should set 'connect' property to false"
      );
      done();
    });
  });

  test("timeout with events", done => {
    const options = { url: server.url + "/timeout", timeout: 50 };
    let eventsEmitted = 0;
    request(options).on("error", error => {
      eventsEmitted++;
      assert.deepStrictEqual(1, eventsEmitted);
      checkErrCode(error);
      done();
    });
  });

  test("not timeout", done => {
    let socket;
    const shouldntTimeout = { url: server.url + "/timeout", timeout: 1200 };
    request(shouldntTimeout, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body, "waited");
      checkEventHandlers(socket);
      done();
    }).on("socket", socket_ => {
      socket = socket_;
    });
  });

  test("no timeout", done => {
    const noTimeout = { url: server.url + "/timeout" };
    request(noTimeout, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(body, "waited");
      done();
    });
  });

  test("negative timeout", done => {
    // should be treated a zero or the minimum delay
    const negativeTimeout = { url: server.url + "/timeout", timeout: -1000 };
    request(negativeTimeout, error => {
      // Only verify error if it is set, since using a timeout value of 0 can lead
      // to inconsistent results, depending on a variety of factors
      if (error) {
        checkErrCode(error);
      }
      done();
    });
  });

  test("float timeout", done => {
    // should be rounded by setTimeout anyway
    const floatTimeout = { url: server.url + "/timeout", timeout: 50.76 };
    request(floatTimeout, error => {
      checkErrCode(error);
      done();
    });
  });

  test("connect timeout", function tryConnect(done) {
    const tarpitHost = "http://" + getNonRoutable();
    const shouldConnectTimeout = {
      url: tarpitHost + "/timeout",
      timeout: 25
    };
    let socket;
    request(shouldConnectTimeout, error => {
      assert.notDeepStrictEqual(error, null);
      if (error.code === "ENETUNREACH" && nrIndex < nonRoutable.length) {
        // With some network configurations, some addresses will be reported as
        // unreachable immediately (before the timeout occurs). In those cases,
        // try other non-routable addresses before giving up.
        return tryConnect(done);
      }
      checkErrCode(error);
      assert.deepStrictEqual(
        error.connect,
        true,
        "Connect Timeout Error should set 'connect' property to true"
      );
      checkEventHandlers(socket);
      nrIndex = 0;
      done();
    }).on("socket", socket_ => {
      socket = socket_;
    });
  });

  test("connect timeout with non-timeout error", function tryConnect(done) {
    const tarpitHost = "http://" + getNonRoutable();
    const shouldConnectTimeout = {
      url: tarpitHost + "/timeout",
      timeout: 250
    };
    let socket;
    request(shouldConnectTimeout, error => {
      assert.notDeepStrictEqual(error, null);
      if (error.code === "ENETUNREACH" && nrIndex < nonRoutable.length) {
        // With some network configurations, some addresses will be reported as
        // unreachable immediately (before the timeout occurs). In those cases,
        // try other non-routable addresses before giving up.
        return tryConnect(done);
      }
      // Delay the check since the 'connect' handler is removed in a separate
      // 'error' handler which gets triggered after this callback
      setImmediate(() => {
        checkEventHandlers(socket);
        nrIndex = 0;
        done();
      });
    }).on("socket", socket_ => {
      socket = socket_;
      setImmediate(() => {
        socket.emit("error", new Error("Fake Error"));
      });
    });
  });

  test("request timeout with keep-alive connection", done => {
    const agent = new Agent({ keepAlive: true });
    const uri = server.url + "/timeout";
    const firstReq = { uri, agent };
    request(firstReq, error => {
      // We should now still have a socket open. For the second request we should
      // see a request timeout on the active socket ...
      assert.deepStrictEqual(error, null);
      const shouldReqTimeout = { uri, timeout: 50, agent };
      request(shouldReqTimeout, error => {
        checkErrCode(error);
        assert.deepStrictEqual(
          error.connect,
          false,
          "Error should have been a request timeout error"
        );
        done();
      }).on("socket", socket => {
        const isConnecting = socket._connecting || socket.connecting;
        assert.notDeepStrictEqual(
          isConnecting,
          true,
          "Socket should already be connected"
        );
      });
    }).on("socket", socket => {
      const isConnecting = socket._connecting || socket.connecting;
      assert.deepStrictEqual(isConnecting, true, "Socket should be new");
    });
  });

  test("calling abort clears the timeout", done => {
    const req = request({ url: server.url + "/timeout", timeout: 1250 });
    setTimeout(() => {
      req.abort();
      assert.deepStrictEqual(req.timeoutTimer, null);
      done();
    }, 5);
  });

  suiteTeardown(done => server.close(done));
});
