const request = require("../index");
const assert = require("assert");
const {
  createServer,
  createGetResponse,
  createChunkResponse,
  createPostValidator
} = require("./lib/server");
const server = createServer();

suite("Body", () => {
  suiteSetup(done => server.listen(0, done));

  const tests = [
    {
      name: "testGet",
      response: createGetResponse("TESTING!"),
      expectBody: "TESTING!"
    },
    {
      name: "testGetChunkBreak",
      response: createChunkResponse([
        Buffer.from([239]),
        Buffer.from([163]),
        Buffer.from([191]),
        Buffer.from([206]),
        Buffer.from([169]),
        Buffer.from([226]),
        Buffer.from([152]),
        Buffer.from([131])
      ]),
      expectBody: "\uF8FF\u03A9\u2603"
    },
    {
      name: "testGetBuffer",
      response: createGetResponse(Buffer.from("TESTING!")),
      encoding: null,
      expectBody: Buffer.from("TESTING!")
    },
    {
      name: "testGetEncoding",
      response: createGetResponse(Buffer.from("efa3bfcea9e29883", "hex")),
      encoding: "hex",
      expectBody: "efa3bfcea9e29883"
    },
    {
      name: "testGetUTF",
      response: createGetResponse(
        Buffer.from([0xef, 0xbb, 0xbf, 226, 152, 131])
      ),
      encoding: "utf8",
      expectBody: "\u2603"
    },
    {
      name: "testGetJSON",
      response: createGetResponse("{\"test\":true}", "application/json"),
      json: true,
      expectBody: { test: true }
    },
    {
      name: "testPutString",
      response: createPostValidator("PUTTINGDATA"),
      method: "PUT",
      body: "PUTTINGDATA"
    },
    {
      name: "testPutBuffer",
      response: createPostValidator("PUTTINGDATA"),
      method: "PUT",
      body: Buffer.from("PUTTINGDATA")
    },
    {
      name: "testPutJSON",
      response: createPostValidator(JSON.stringify({ foo: "bar" })),
      method: "PUT",
      json: { foo: "bar" }
    },
    {
      name: "testPutMultipart",
      response: createPostValidator(
        "--__BOUNDARY__\r\n" +
          "content-type: text/html\r\n" +
          "\r\n" +
          "<html><body>Oh hi.</body></html>" +
          "\r\n--__BOUNDARY__\r\n\r\n" +
          "Oh hi." +
          "\r\n--__BOUNDARY__--"
      ),
      method: "PUT",
      multipart: [
        {
          "content-type": "text/html",
          body: "<html><body>Oh hi.</body></html>"
        },
        { body: "Oh hi." }
      ]
    },
    {
      name: "testPutMultipartPreambleCRLF",
      response: createPostValidator(
        "\r\n--__BOUNDARY__\r\n" +
          "content-type: text/html\r\n" +
          "\r\n" +
          "<html><body>Oh hi.</body></html>" +
          "\r\n--__BOUNDARY__\r\n\r\n" +
          "Oh hi." +
          "\r\n--__BOUNDARY__--"
      ),
      method: "PUT",
      preambleCRLF: true,
      multipart: [
        {
          "content-type": "text/html",
          body: "<html><body>Oh hi.</body></html>"
        },
        { body: "Oh hi." }
      ]
    },
    {
      name: "testPutMultipartPostambleCRLF",
      response: createPostValidator(
        "\r\n--__BOUNDARY__\r\n" +
          "content-type: text/html\r\n" +
          "\r\n" +
          "<html><body>Oh hi.</body></html>" +
          "\r\n--__BOUNDARY__\r\n\r\n" +
          "Oh hi." +
          "\r\n--__BOUNDARY__--" +
          "\r\n"
      ),
      method: "PUT",
      preambleCRLF: true,
      postambleCRLF: true,
      multipart: [
        {
          "content-type": "text/html",
          body: "<html><body>Oh hi.</body></html>"
        },
        { body: "Oh hi." }
      ]
    }
  ];

  tests.forEach(({ name, ...rest }) => {
    test(name, done => {
      server.on("/" + name, rest.response);
      rest.uri = server.url + "/" + name;
      request(rest, (error, response, body) => {
        assert.deepStrictEqual(error, null);
        if (rest.expectBody && Buffer.isBuffer(rest.expectBody)) {
          assert.deepStrictEqual(rest.expectBody.toString(), body.toString());
        } else if (rest.expectBody) {
          assert.deepStrictEqual(rest.expectBody, body);
        }
        done();
      });
    });
  });

  test("typed array", done => {
    const server = createServer();
    server.on("request", (request, response) => request.pipe(response));
    server.listen(0, () => {
      const data = new Uint8Array([1, 2, 3]);
      request(
        {
          uri: "http://localhost:" + server.address().port,
          method: "POST",
          body: data,
          encoding: null
        },
        (error, response, body) => {
          assert.ifError(error);
          assert.deepStrictEqual(Buffer.from(data), body);
          server.close(done);
        }
      );
    });
  });

  suiteTeardown(done => server.close(done));
});
