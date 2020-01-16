const request = require("../index");
const assert = require("assert");
const path = require("path");
const fixture = require("./fixtures/har.json");
const server = require("./lib/server").createEchoServer();

suite("HAR", () => {
  suiteSetup(done => server.listen(0, done));

  test("application-form-encoded", done => {
    const har = fixture["application-form-encoded"];
    const options = { url: server.url, har };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(json.body, "foo=bar&hello=world");
      done();
    });
  });

  test("application-json", done => {
    const har = fixture["application-json"];
    const options = { url: server.url, har };

    request(options, (error, response, body) => {
      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(
        body.body,
        fixture["application-json"].postData.text
      );
      done();
    });
  });

  test("cookies", done => {
    const options = { url: server.url, har: fixture.cookies };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(json.headers.cookie, "foo=bar; bar=baz");
      done();
    });
  });

  test("custom-method", done => {
    const options = { url: server.url, har: fixture["custom-method"] };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(json.method, fixture["custom-method"].method);
      done();
    });
  });

  test("headers", done => {
    const options = { url: server.url, har: fixture.headers };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(json.headers["x-foo"], "Bar");
      done();
    });
  });

  test("multipart-data", done => {
    const options = { url: server.url, har: fixture["multipart-data"] };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.ok(~json.headers["content-type"].indexOf("multipart/form-data"));
      assert.ok(
        ~json.body.indexOf(
          "Content-Disposition: form-data; name=\"foo\"; filename=\"hello.txt\"\r\nContent-Type: text/plain\r\n\r\nHello World"
        )
      );
      done();
    });
  });

  test("multipart-file", done => {
    const options = { url: server.url, har: fixture["multipart-file"] };
    const absolutePath = path.resolve(
      __dirname,
      options.har.postData.params[0].fileName
    );
    options.har.postData.params[0].fileName = absolutePath;

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.ok(~json.headers["content-type"].indexOf("multipart/form-data"));
      assert.ok(
        ~json.body.indexOf(
          "Content-Disposition: form-data; name=\"foo\"; filename=\"unicycle.jpg\"\r\nContent-Type: image/jpeg"
        )
      );
      done();
    });
  });

  test("multipart-form-data", done => {
    const options = { url: server.url, har: fixture["multipart-form-data"] };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.ok(~json.headers["content-type"].indexOf("multipart/form-data"));
      assert.ok(
        ~json.body.indexOf("Content-Disposition: form-data; name=\"foo\"")
      );
      done();
    });
  });

  test("query", done => {
    const options = { url: server.url + "/?fff=sss", har: fixture.query };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(
        json.url,
        "/?fff=sss&foo%5B0%5D=bar&foo%5B1%5D=baz&baz=abc"
      );
      done();
    });
  });

  test("text/plain", done => {
    const options = { url: server.url, har: fixture["text-plain"] };

    request(options, (error, response, body) => {
      const json = JSON.parse(body);

      assert.deepStrictEqual(error, null);
      assert.deepStrictEqual(json.headers["content-type"], "text/plain");
      assert.deepStrictEqual(json.body, "Hello World");
      done();
    });
  });

  suiteTeardown(done => server.close(done));
});
