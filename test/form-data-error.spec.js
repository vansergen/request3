const request = require("../index");
const assert = require("assert");
const { createServer, createChunkResponse } = require("./lib/server");
const server = createServer();

server.on("/", (request, response) => {
  response.writeHead(400);
  response.end();
  assert.fail("The form-data error did not abort the request.");
});
// returns chunked HTTP response which is streamed to the 2nd HTTP request in the form data
server.on("/chunky", createChunkResponse(["some string", "some other string"]));
server.on("/stream", (request, response) => {
  request.on("data", () => {}); // consume the request body
  request.on("end", () => {
    response.writeHead(200);
    response.end();
  });
});

suite("Form-data errors", () => {
  suiteSetup(done => server.listen(0, done));

  test("re-emit formData errors", done => {
    request
      .post(server.url, error => {
        assert.deepStrictEqual(
          error.message,
          "form-data: Arrays are not supported."
        );
        setTimeout(done, 10);
      })
      .form()
      .append("field", ["value1", "value2"]);
  });

  test("omit content-length header if the value is set to NaN", done => {
    request.get({ uri: server.url + "/chunky" }).on("response", response => {
      const uri = server.url + "/stream";
      request.post({ uri, formData: { param: response } }, error => {
        assert.deepStrictEqual(error, null, "request failed");
        done();
      });
    });
  });

  // TODO: remove this test after form-data@2.0 starts stringifying null values
  test("form-data should throw on null value", done => {
    assert.throws(() => {
      request({ method: "POST", url: server.url, formData: { key: null } });
    }, TypeError);
    done();
  });

  suiteTeardown(done => server.close(done));
});
