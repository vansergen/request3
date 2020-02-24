const request = require("../index");
const assert = require("assert");
let called = false;
const proxiedHost = "google.com";
let data = "";

const server = require("net").createServer(socket => {
  called = true;
  socket.once("data", c => {
    data += c;

    socket.write("HTTP/1.1 200 OK\r\n\r\n");

    socket.once("data", c => {
      data += c;

      socket.write("HTTP/1.1 200 OK\r\n");
      socket.write("content-type: text/plain\r\n");
      socket.write("content-length: 5\r\n");
      socket.write("\r\n");
      socket.end("derp\n");
    });
  });
});
server.on("listening", () => {
  server.url = "http://localhost:" + server.address().port;
});

suite("Proxy connect", () => {
  suiteSetup(done => server.listen(0, done));

  test("proxy", done => {
    request(
      {
        tunnel: true,
        url: "http://" + proxiedHost,
        proxy: server.url,
        headers: {
          "Proxy-Authorization": "Basic dXNlcjpwYXNz",
          authorization: "Token deadbeef",
          "dont-send-to-proxy": "ok",
          "dont-send-to-dest": "ok",
          accept: "yo",
          "user-agent": "just another foobar"
        },
        proxyHeaderExclusiveList: ["Dont-send-to-dest"]
      },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.statusCode, 200);
        assert.deepStrictEqual(body, "derp\n");
        const regExp = new RegExp(
          [
            "CONNECT google.com:80 HTTP/1.1",
            "Proxy-Authorization: Basic dXNlcjpwYXNz",
            "dont-send-to-dest: ok",
            "accept: yo",
            "user-agent: just another foobar",
            "host: google.com:80",
            "Connection: close",
            "",
            "GET / HTTP/1.1",
            "authorization: Token deadbeef",
            "dont-send-to-proxy: ok",
            "accept: yo",
            "user-agent: just another foobar",
            "host: google.com"
          ].join("\r\n")
        );
        assert.deepStrictEqual(true, regExp.test(data));
        assert.deepStrictEqual(
          called,
          true,
          "the request must be made to the proxy server"
        );
        done();
      }
    );
  });

  suiteTeardown(done => server.close(done));
});
