const request = require("../index");
const assert = require("assert");

const uri = "http://localhost:0/asdf";

suite("Errors", () => {
  test("without uri", done => {
    assert.throws(() => {
      request({});
    }, /^Error: options\.uri is a required argument$/);
    done();
  });

  test("without uri 2", done => {
    assert.throws(() => {
      request({ uri: "this-is-not-a-valid-uri" });
    }, /^TypeError \[ERR_INVALID_URL\]: Invalid URL/);
    done();
  });

  test("without uri 3", done => {
    assert.throws(() => {
      request({ uri: "github.com/uri-is-not-valid-without-protocol" });
    }, /^TypeError \[ERR_INVALID_URL\]: Invalid URL/);
    done();
  });

  test("invalid uri + NO_PROXY", done => {
    process.env.NO_PROXY = "google.com";
    assert.throws(() => {
      request({ uri: "invalid" });
    }, /^TypeError \[ERR_INVALID_URL\]: Invalid URL/);
    delete process.env.NO_PROXY;
    done();
  });

  test("deprecated unix URL", done => {
    assert.throws(() => {
      request({ uri: "unix://path/to/socket/and/then/request/path" });
    }, /^Error: `unix:\/\/` URL scheme is no longer supported/);
    done();
  });

  test("invalid body", done => {
    assert.throws(() => {
      request({ uri, body: {} });
    }, /^Error: Argument error, options\.body\.$/);
    done();
  });

  test("invalid multipart", done => {
    assert.throws(() => {
      request({ uri, multipart: "foo" });
    }, /^Error: Argument error, options\.multipart\.$/);
    done();
  });

  test("multipart without body", done => {
    assert.throws(() => {
      request({ uri, multipart: [{}] });
    }, /^Error: Body attribute missing in multipart\.$/);
    done();
  });

  test("multipart without body 2", done => {
    assert.throws(() => {
      request(uri, { multipart: [{}] });
    }, /^Error: Body attribute missing in multipart\.$/);
    done();
  });

  test("head method with a body", done => {
    assert.throws(() => {
      request(uri, { method: "HEAD", body: "foo" });
    }, /HTTP HEAD requests MUST NOT include a request body/);
    done();
  });

  test("head method with a body 2", done => {
    assert.throws(() => {
      request.head(uri, { body: "foo" });
    }, /HTTP HEAD requests MUST NOT include a request body/);
    done();
  });
});
