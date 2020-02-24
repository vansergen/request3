const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  response.writeHead(200, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(request.headers));
});

const path = "/aws.json";

suite("AWS", () => {
  suiteSetup(done => server.listen(0, done));

  test("default behaviour: aws-sign2 without sign_version key", done => {
    const options = {
      url: server.url + path,
      aws: {
        key: "my_key",
        secret: "my_secret"
      },
      json: true
    };
    request(options, (error, response, body) => {
      assert.ifError(error);
      assert.ok(body.authorization);
      assert.ok(!body["x-amz-date"]);
      done();
    });
  });

  test("aws-sign4 options", done => {
    const options = {
      url: server.url + path,
      aws: {
        key: "my_key",
        secret: "my_secret",
        sign_version: 4
      },
      json: true
    };
    request(options, (error, response, body) => {
      assert.ifError(error);
      assert.ok(body.authorization);
      assert.ok(body["x-amz-date"]);
      assert.ok(!body["x-amz-security-token"]);
      done();
    });
  });

  test("aws-sign4 options with session token", done => {
    const options = {
      url: server.url + path,
      aws: {
        key: "my_key",
        secret: "my_secret",
        session: "session",
        sign_version: 4
      },
      json: true
    };
    request(options, (error, response, body) => {
      assert.ifError(error);
      assert.ok(body.authorization);
      assert.ok(body["x-amz-date"]);
      assert.ok(body["x-amz-security-token"]);
      done();
    });
  });

  test("aws-sign4 options with service", done => {
    const serviceName = "UNIQUE_SERVICE_NAME";
    const options = {
      url: server.url + path,
      aws: {
        key: "my_key",
        secret: "my_secret",
        sign_version: 4,
        service: serviceName
      },
      json: true
    };
    request(options, (error, response, body) => {
      assert.ifError(error);
      assert.ok(body.authorization.includes(serviceName));
      done();
    });
  });

  test("aws-sign4 with additional headers", done => {
    const options = {
      url: server.url + path,
      headers: {
        "X-Custom-Header": "custom"
      },
      aws: {
        key: "my_key",
        secret: "my_secret",
        sign_version: 4
      },
      json: true
    };
    request(options, (error, response, body) => {
      assert.ifError(error);
      assert.ok(body.authorization.includes("x-custom-header"));
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
