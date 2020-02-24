const request = require("../index");
const assert = require("assert");
const Server = require("./lib/server");
const server = Server.createServer();

suite("Params", () => {
  suiteSetup(done => server.listen(0, done));

  test("Get", done => {
    const expectedBody = "TESTING!";
    const resp = Server.createGetResponse("TESTING!");
    server.once("/Get", resp);
    request(server.url + "/Get", (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(expectedBody, body);
      done();
    });
  });

  test("GetChunkBreak", done => {
    const expectedBody = "\uf8ff\u03a9\u2603";
    const resp = Server.createChunkResponse([
      Buffer.from([239]),
      Buffer.from([163]),
      Buffer.from([191]),
      Buffer.from([206]),
      Buffer.from([169]),
      Buffer.from([226]),
      Buffer.from([152]),
      Buffer.from([131])
    ]);
    server.once("/GetChunkBreak", resp);
    request(server.url + "/GetChunkBreak", (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(expectedBody, body);
      done();
    });
  });

  test("GetBuffer", done => {
    const expectedBody = Buffer.from("TESTING!");
    const resp = Server.createGetResponse(Buffer.from("TESTING!"));
    server.once("/GetBuffer", resp);
    const uri = server.url + "/GetBuffer";
    request(uri, { encoding: null }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(expectedBody.toString(), body.toString());
      done();
    });
  });

  test("GetJSON", done => {
    const expectedBody = { test: true };
    const resp = Server.createGetResponse('{"test":true}', "application/json");
    server.once("/GetJSON", resp);
    const uri = server.url + "/GetJSON";
    request(uri, { json: true }, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(expectedBody, body);
      done();
    });
  });

  test("PutString", done => {
    const body = "PUTTINGDATA";
    const resp = Server.createPostValidator(body);
    server.once("/PutString", resp);
    const uri = server.url + "/PutString";
    request(uri, { body, method: "PUT" }, error => {
      assert.deepStrictEqual(error, null);
      done();
    });
  });

  test("PutBuffer", done => {
    const resp = Server.createPostValidator("PUTTINGDATA");
    server.once("/PutBuffer", resp);
    const uri = server.url + "/PutBuffer";
    const body = Buffer.from("PUTTINGDATA");
    request(uri, { body, method: "PUT" }, error => {
      assert.deepStrictEqual(error, null);
      done();
    });
  });

  test("PutJSON", done => {
    const resp = Server.createPostValidator(JSON.stringify({ foo: "bar" }));
    server.once("/PutJSON", resp);
    const uri = server.url + "/PutJSON";
    request(uri, { json: { foo: "bar" }, method: "PUT" }, error => {
      assert.deepStrictEqual(error, null);
      done();
    });
  });

  test("PutMultipart", done => {
    const resp = Server.createPostValidator(
      "--__BOUNDARY__\r\n" +
        "content-type: text/html\r\n" +
        "\r\n" +
        "<html><body>Oh hi.</body></html>" +
        "\r\n--__BOUNDARY__\r\n\r\n" +
        "Oh hi." +
        "\r\n--__BOUNDARY__--"
    );
    server.once("/PutMultipart", resp);
    const uri = server.url + "/PutMultipart";
    const multipart = [
      { "content-type": "text/html", body: "<html><body>Oh hi.</body></html>" },
      { body: "Oh hi." }
    ];
    request(uri, { multipart, method: "PUT" }, error => {
      assert.deepStrictEqual(error, null);
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
