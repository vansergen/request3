const request = require("../../index");
const assert = require("assert");

suite("browser", () => {
  test("returns on error", done => {
    const uri = "https://stupid.nonexistent.path:port123/\\<-great-idea";
    request({ uri, withCredentials: false }, error => {
      assert.deepStrictEqual(typeof error, "object");
      done();
    });
  });

  test("succeeds on valid URLs (with https and CORS)", done => {
    const uri = __karma__.config.requestTestUrl; // eslint-disable-line no-undef
    const expectedBody =
      "Can you hear the sound of an enormous door slamming in the depths of hell?\n";
    request({ uri, withCredentials: false }, (_, response, body) => {
      assert.deepStrictEqual(response.statusCode, 200);
      assert.deepStrictEqual(body, expectedBody);
      done();
    });
  });
});
