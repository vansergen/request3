const {
  createServer,
  createPostValidator,
  createGetResponse
} = require("./lib/server");
const stream = require("stream");
const fs = require("fs");
const request = require("../index");
const path = require("path");
const assert = require("assert");

const server = createServer();

const fileContents = fs.readFileSync(__filename);

server.on("/cat", (req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, {
      "content-type": "text/plain-test",
      "content-length": 4
    });
    res.end("asdf");
  } else if (req.method === "PUT") {
    let body = "";
    req
      .on("data", chunk => {
        body += chunk;
      })
      .on("end", () => {
        res.writeHead(201);
        res.end();
        server.emit("catDone", req, res, body);
      });
  }
});

server.on("/doodle", (req, res) => {
  if (req.headers["x-oneline-proxy"]) {
    res.setHeader("x-oneline-proxy", "yup");
  }
  res.writeHead("200", { "content-type": "image/jpeg" });
  fs.createReadStream(path.join(__dirname, "googledoodle.jpg")).pipe(res);
});

class ValidationStream extends stream.Stream {
  constructor(str) {
    super();
    this.str = str;
    this.buf = "";
    this.on("data", data => (this.buf += data));
    this.on("end", () => assert.deepStrictEqual(this.str, this.buf));
    this.writable = true;
  }

  write(chunk) {
    this.emit("data", chunk);
  }

  end(chunk) {
    if (chunk) {
      this.emit("data", chunk);
    }
    this.emit("end");
  }
}

suite("Pipes", () => {
  suiteSetup(done => server.listen(0, done));

  test("piping to a request object", done => {
    server.once("/push", createPostValidator("mydata"));

    const mydata = new stream.Stream();
    mydata.readable = true;

    const r1 = request.put({ url: server.url + "/push" }, (err, res, body) => {
      assert.deepStrictEqual(err, null);
      assert.deepStrictEqual(res.statusCode, 200);
      assert.deepStrictEqual(body, "mydata");
      done();
    });
    mydata.pipe(r1);

    mydata.emit("data", "mydata");
    mydata.emit("end");
  });

  test("piping to a request object with invalid uri", done => {
    const mybodydata = new stream.Stream();
    mybodydata.readable = true;

    const r2 = request.put({ url: "/bad-uri", json: true }, err => {
      assert.ok(err instanceof Error);
      assert.deepStrictEqual(err.message, "Invalid URL: /bad-uri");
      done();
    });
    mybodydata.pipe(r2);

    mybodydata.emit("data", JSON.stringify({ foo: "bar" }));
    mybodydata.emit("end");
  });

  test("piping to a request object with a json body", done => {
    const obj = { foo: "bar" };
    const json = JSON.stringify(obj);
    server.once("/push-json", createPostValidator(json, "application/json"));
    const mybodydata = new stream.Stream();
    mybodydata.readable = true;

    const r2 = request.put(
      { url: server.url + "/push-json", json: true },
      (err, res, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.statusCode, 200);
        assert.deepStrictEqual(body, obj);
        done();
      }
    );
    mybodydata.pipe(r2);

    mybodydata.emit("data", JSON.stringify({ foo: "bar" }));
    mybodydata.emit("end");
  });

  test("piping from a request object", done => {
    server.once("/pull", createGetResponse("mypulldata"));

    const mypulldata = new stream.Stream();
    mypulldata.writable = true;

    request({ url: server.url + "/pull" }).pipe(mypulldata);

    let d = "";

    mypulldata.write = chunk => (d += chunk);
    mypulldata.end = () => {
      assert.deepStrictEqual(d, "mypulldata");
      done();
    };
  });

  test("pause when piping from a request object", done => {
    server.once("/chunks", (req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.write("Chunk 1");
      setTimeout(() => res.end("Chunk 2"), 10);
    });

    let chunkNum = 0;
    let paused = false;
    request({ url: server.url + "/chunks" })
      .on("data", function(chunk) {
        const self = this;

        assert.ok(!paused, "Only receive data when not paused");

        ++chunkNum;
        if (chunkNum === 1) {
          assert.deepStrictEqual(chunk.toString(), "Chunk 1");
          self.pause();
          paused = true;
          setTimeout(() => {
            paused = false;
            self.resume();
          }, 100);
        } else {
          assert.deepStrictEqual(chunk.toString(), "Chunk 2");
        }
      })
      .on("end", done);
  });

  test("pause before piping from a request object", done => {
    server.once("/pause-before", (req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("Data");
    });

    let paused = true;
    const r = request({ url: server.url + "/pause-before" });
    r.pause();
    r.on("data", data => {
      assert.ok(!paused, "Only receive data when not paused");
      assert.deepStrictEqual(data.toString(), "Data");
    });
    r.on("end", done);

    setTimeout(() => {
      paused = false;
      r.resume();
    }, 100);
  });

  // TODO Piping from a file does not send content-length header
  const cases = [
    { name: "piping from a file", hasContentLength: false },
    { name: "piping from a file with content-length", hasContentLength: true }
  ];

  cases.forEach(({ name, hasContentLength }) => {
    test(name, done => {
      server.once("/pushjs", (req, res) => {
        if (req.method === "PUT") {
          assert.deepStrictEqual(
            req.headers["content-type"],
            "application/javascript"
          );
          assert.deepStrictEqual(
            req.headers["content-length"],
            hasContentLength ? "" + fileContents.length : undefined
          );
          let body = "";
          req.setEncoding("utf8");
          req.on("data", data => (body += data));
          req.on("end", () => {
            res.end();
            assert.deepStrictEqual(body, fileContents.toString());
            done();
          });
        } else {
          res.end();
        }
      });
      const r = request.put(server.url + "/pushjs");
      fs.createReadStream(__filename).pipe(r);
      if (hasContentLength) {
        r.setHeader("content-length", fileContents.length);
      }
    });
  });

  test("piping to and from same URL", done => {
    server.once("catDone", (req, res, body) => {
      assert.deepStrictEqual(req.headers["content-type"], "text/plain-test");
      assert.deepStrictEqual(req.headers["content-length"], "4");
      assert.deepStrictEqual(body, "asdf");
      done();
    });
    request.get(server.url + "/cat").pipe(request.put(server.url + "/cat"));
  });

  test("piping between urls", done => {
    server.once("/catresp", (req, res) => {
      request.get(server.url + "/cat").pipe(res);
    });

    request.get(server.url + "/catresp", (err, res) => {
      assert.deepStrictEqual(err, null);
      assert.deepStrictEqual(res.headers["content-type"], "text/plain-test");
      assert.deepStrictEqual(res.headers["content-length"], "4");
      done();
    });
  });

  test("writing to file", done => {
    const doodleWrite = fs.createWriteStream(path.join(__dirname, "test.jpg"));

    request.get(server.url + "/doodle").pipe(doodleWrite);

    doodleWrite.on("close", () => {
      assert.deepStrictEqual(
        fs.readFileSync(path.join(__dirname, "googledoodle.jpg")),
        fs.readFileSync(path.join(__dirname, "test.jpg"))
      );
      fs.unlinkSync(path.join(__dirname, "test.jpg"));
      done();
    });
  });

  test("one-line proxy", done => {
    server.once("/onelineproxy", (req, res) => {
      const x = request(server.url + "/doodle");
      req.pipe(x);
      x.pipe(res);
    });

    request.get(
      {
        uri: server.url + "/onelineproxy",
        headers: { "x-oneline-proxy": "nope" }
      },
      (err, res, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.headers["x-oneline-proxy"], "yup");
        assert.deepStrictEqual(
          body,
          fs.readFileSync(path.join(__dirname, "googledoodle.jpg")).toString()
        );
        done();
      }
    );
  });

  test("piping after response", done => {
    server.once("/afterresponse", (req, res) => {
      res.write("d");
      res.end();
    });

    const rAfterRes = request.post(server.url + "/afterresponse");

    rAfterRes.on("response", () => {
      const v = new ValidationStream("d");
      rAfterRes.pipe(v);
      v.on("end", done);
    });
  });

  test("piping through a redirect", done => {
    server.once("/forward1", (req, res) => {
      res.writeHead(302, { location: "/forward2" });
      res.end();
    });
    server.once("/forward2", (req, res) => {
      res.writeHead("200", { "content-type": "image/png" });
      res.write("d");
      res.end();
    });

    const validateForward = new ValidationStream("d");

    request.get(server.url + "/forward1").pipe(validateForward);

    validateForward.on("end", () => {
      done();
    });
  });

  test("pipe options", done => {
    server.once("/opts", createGetResponse("opts response"));

    const optsStream = new stream.Stream();
    let optsData = "";

    optsStream.writable = true;
    optsStream.write = buf => {
      optsData += buf;
      if (optsData === "opts response") {
        setTimeout(() => {
          done();
        }, 10);
      }
    };
    optsStream.end = () => {
      assert.fail("end called");
    };

    request({
      url: server.url + "/opts"
    }).pipe(optsStream, { end: false });
  });

  test("request.pipefilter is called correctly", done => {
    server.once("/pipefilter", (req, res) => res.end("d"));
    const validatePipeFilter = new ValidationStream("d");

    const r3 = request.get(server.url + "/pipefilter");
    r3.pipe(validatePipeFilter);
    r3.pipefilter = (res, dest) => {
      assert.deepStrictEqual(res, r3.response);
      assert.deepStrictEqual(dest, validatePipeFilter);
      done();
    };
  });

  suiteTeardown(done => server.close(done));
});
