const request = require("../index");
const assert = require("assert");
const server = require("./lib/server").createServer();

server.on("request", (request, response) => {
  if (request.url === "/valid") {
    response.setHeader("set-cookie", "foo=bar");
  } else if (request.url === "/malformed") {
    response.setHeader("set-cookie", "foo");
  } else if (request.url === "/invalid") {
    response.setHeader("set-cookie", "foo=bar; Domain=foo.com");
  }
  response.end("okay");
});

let validUrl;
let malformedUrl;
let invalidUrl;

server.on("listening", () => {
  const url = "http://localhost:" + server.address().port;
  validUrl = url + "/valid";
  malformedUrl = url + "/malformed";
  invalidUrl = url + "/invalid";
});

suite("Cookies", () => {
  suiteSetup(done => server.listen(0, done));

  test("simple cookie creation", done => {
    const cookie = request.cookie("foo=bar");
    assert.deepStrictEqual(cookie.key, "foo");
    assert.deepStrictEqual(cookie.value, "bar");
    done();
  });

  test("simple malformed cookie creation", done => {
    const cookie = request.cookie("foo");
    assert.deepStrictEqual(cookie.key, "");
    assert.deepStrictEqual(cookie.value, "foo");
    done();
  });

  test("after server sends a cookie", done => {
    const jar1 = request.jar();
    request(
      { method: "GET", url: validUrl, jar: jar1 },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(jar1.getCookieString(validUrl), "foo=bar");
        assert.deepStrictEqual(body, "okay");

        const cookies = jar1.getCookies(validUrl);
        const [cookie] = cookies;
        assert.deepStrictEqual([cookie], cookies);
        assert.deepStrictEqual(cookie.key, "foo");
        assert.deepStrictEqual(cookie.value, "bar");
        done();
      }
    );
  });

  test("after server sends a malformed cookie", done => {
    const jar = request.jar();
    request(
      { method: "GET", url: malformedUrl, jar },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(jar.getCookieString(malformedUrl), "foo");
        assert.deepStrictEqual(body, "okay");

        const cookies = jar.getCookies(malformedUrl);
        const [cookie] = cookies;
        assert.deepStrictEqual([cookie], cookies);
        assert.deepStrictEqual(cookie.key, "");
        assert.deepStrictEqual(cookie.value, "foo");
        done();
      }
    );
  });

  test("after server sends a cookie for a different domain", done => {
    const jar2 = request.jar();
    request(
      { method: "GET", url: invalidUrl, jar: jar2 },
      (error, response, body) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(jar2.getCookieString(validUrl), "");
        assert.deepStrictEqual(jar2.getCookies(validUrl), []);
        assert.deepStrictEqual(body, "okay");
        done();
      }
    );
  });

  test("make sure setCookie works", done => {
    const jar3 = request.jar();
    jar3.setCookie(request.cookie("foo=bar"), validUrl);
    const cookies = jar3.getCookies(validUrl);
    const [cookie] = cookies;
    assert.deepStrictEqual([cookie], cookies);
    assert.deepStrictEqual(cookie.key, "foo");
    assert.deepStrictEqual(cookie.value, "bar");
    done();
  });

  test("custom store", done => {
    class Store {}
    const store = new Store();
    const jar = request.jar(store);
    assert.deepStrictEqual(store, jar._jar.store);
    done();
  });

  suiteTeardown(done => server.close(done));
});
