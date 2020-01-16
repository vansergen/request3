const request = require("../index");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  request.pipe(response);
});

suite("Stream", () => {
  suiteSetup(done => server.listen(0, done));

  test("request body stream", done => {
    const fpath = path.join(__dirname, "unicycle.jpg");
    const input = fs.createReadStream(fpath, { highWaterMark: 1000 });
    request(
      { uri: server.url, method: "POST", body: input, encoding: null },
      (error, response, body) => {
        assert.ifError(error);
        assert.deepStrictEqual(body.length, fs.statSync(fpath).size);
        done();
      }
    );
  });

  suiteTeardown(done => server.close(done));
});
