const {
  createSSLServer,
  createGetResponse,
  createChunkResponse,
  createPostValidator
} = require("./lib/server");
const request = require("../index");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const caFile = path.resolve(__dirname, "ssl/ca/ca.crt");
const ca = fs.readFileSync(caFile);
const opts = {
  ciphers: "AES256-SHA",
  key: path.resolve(__dirname, "ssl/ca/server.key"),
  cert: path.resolve(__dirname, "ssl/ca/server.crt")
};
const sStrict = createSSLServer(opts);

suite("HTTPS strict", () => {
  suiteSetup(done => sStrict.listen(0, done));

  const cases = [
    [
      "testGet",
      { resp: createGetResponse("TESTING!"), expectBody: "TESTING!" }
    ],
    [
      "testGetChunkBreak",
      {
        resp: createChunkResponse([
          Buffer.from([239]),
          Buffer.from([163]),
          Buffer.from([191]),
          Buffer.from([206]),
          Buffer.from([169]),
          Buffer.from([226]),
          Buffer.from([152]),
          Buffer.from([131])
        ]),
        expectBody: "\uf8ff\u03a9\u2603"
      }
    ],
    [
      "testGetJSON",
      {
        resp: createGetResponse('{"test":true}', "application/json"),
        json: true,
        expectBody: { test: true }
      }
    ],
    [
      "testPutString",
      {
        resp: createPostValidator("PUTTINGDATA"),
        method: "PUT",
        body: "PUTTINGDATA"
      }
    ],
    [
      "testPutBuffer",
      {
        resp: createPostValidator("PUTTINGDATA"),
        method: "PUT",
        body: Buffer.from("PUTTINGDATA")
      }
    ],
    [
      "testPutJSON",
      {
        resp: createPostValidator(JSON.stringify({ foo: "bar" })),
        method: "PUT",
        json: { foo: "bar" }
      }
    ],
    [
      "testPutMultipart",
      {
        resp: createPostValidator(
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
      }
    ]
  ];

  cases.forEach(([name, params]) => {
    test(name, done => {
      sStrict.on("/" + name, params.resp);
      params.uri = sStrict.url + "/" + name;
      params.strictSSL = true;
      params.ca = ca;
      params.headers = { host: "testing.request.mikealrogers.com" };
      request(params, (err, resp, body) => {
        assert.deepStrictEqual(err, null);
        if (params.expectBody) {
          assert.deepStrictEqual(params.expectBody, body);
        }
        done();
      });
    });
  });

  suiteTeardown(done => sStrict.close(done));
});
