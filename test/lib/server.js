const fs = require("fs");
const http = require("http");
const path = require("path");
const https = require("https");
const { Stream } = require("stream");
const assert = require("assert");

class Server {
  static createServer() {
    const server = http.createServer((request, response) => {
      server.emit(request.url.replace(/(\?.*)/, ""), request, response);
    });
    server.on("listening", () => {
      server.port = server.address().port;
      server.url = "http://localhost:" + server.port;
    });
    server.port = 0;
    server.protocol = "http";
    return server;
  }

  static createEchoServer() {
    const server = http.createServer((request, response) => {
      let b = "";
      request.on("data", chunk => {
        b += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" });
        response.write(
          JSON.stringify({
            url: request.url,
            method: request.method,
            headers: request.headers,
            body: b
          })
        );
        response.end();
      });
    });
    server.on("listening", () => {
      server.port = server.address().port;
      server.url = "http://localhost:" + server.port;
    });
    server.port = 0;
    server.protocol = "http";
    return server;
  }

  static createSSLServer(opts) {
    const options = {
      key: path.join(__dirname, "ssl", "test.key"),
      cert: path.join(__dirname, "ssl", "test.crt")
    };
    if (opts) {
      for (let i in opts) {
        options[i] = opts[i];
      }
    }

    for (let i in options) {
      if (
        i !== "requestCert" &&
        i !== "rejectUnauthorized" &&
        i !== "ciphers"
      ) {
        options[i] = fs.readFileSync(options[i]);
      }
    }

    const server = https.createServer(options, (request, response) => {
      server.emit(request.url, request, response);
    });
    server.on("listening", () => {
      server.port = server.address().port;
      server.url = "https://localhost:" + server.port;
    });
    server.port = 0;
    server.protocol = "https";
    return server;
  }

  static createPostStream(text) {
    const postStream = new Stream();
    postStream.writeable = true;
    postStream.readable = true;
    setTimeout(() => {
      postStream.emit("data", Buffer.from(text));
      postStream.emit("end");
    }, 0);
    return postStream;
  }

  static createPostValidator(text, reqContentType) {
    return (request, response) => {
      let r = "";
      request.on("data", chunk => (r += chunk));
      request.on("end", () => {
        if (
          request.headers["content-type"] &&
          request.headers["content-type"].indexOf("boundary=") >= 0
        ) {
          const [, boundary] = request.headers["content-type"].split(
            "boundary="
          );
          text = text.replace(/__BOUNDARY__/g, boundary);
        }
        assert.strictEqual(r, text);
        if (reqContentType) {
          assert.ok(request.headers["content-type"]);
          assert.ok(~request.headers["content-type"].indexOf(reqContentType));
        }
        response.writeHead(200, { "content-type": "text/plain" });
        response.write(r);
        response.end();
      });
    };
  }

  static createPostJSONValidator(value, reqContentType) {
    return (request, response) => {
      let r = "";
      request.on("data", chunk => (r += chunk));
      request.on("end", () => {
        const parsedValue = JSON.parse(r);
        assert.deepStrictEqual(parsedValue, value);
        if (reqContentType) {
          assert.ok(request.headers["content-type"]);
          assert.ok(~request.headers["content-type"].indexOf(reqContentType));
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.write(r);
        response.end();
      });
    };
  }

  static createGetResponse(text, contentType) {
    return (request, response) => {
      contentType = contentType || "text/plain";
      response.writeHead(200, { "content-type": contentType });
      response.write(text);
      response.end();
    };
  }

  static createChunkResponse(chunks, contentType) {
    return (request, response) => {
      contentType = contentType || "text/plain";
      response.writeHead(200, { "content-type": contentType });
      chunks.forEach(chunk => response.write(chunk));
      response.end();
    };
  }
}

module.exports = Server;
