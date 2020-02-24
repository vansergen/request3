const request = require("../index");
const assert = require("assert");
const os = require("os");

suite("Local address", () => {
  test("bind to invalid address", done => {
    const uri = "http://www.google.com";
    request.get({ uri, localAddress: "1.2.3.4" }, (error, response) => {
      assert.notDeepStrictEqual(error, null);
      assert.deepStrictEqual(true, /bind EADDRNOTAVAIL/.test(error.message));
      assert.deepStrictEqual(response, undefined);
      done();
    });
  });

  test("bind to local address", done => {
    const uri = "http://www.google.com";
    request.get({ uri, localAddress: "127.0.0.1" }, (error, response) => {
      assert.notDeepStrictEqual(error, null);
      assert.deepStrictEqual(response, undefined);
      done();
    });
  });

  test("bind to local address on redirect", done => {
    const localIPS = [];
    const localInterfaces = os.networkInterfaces();
    Object.keys(localInterfaces).forEach(ifname => {
      localInterfaces[ifname].forEach(iface => {
        if (iface.family !== "IPv4" || iface.internal !== false) {
          return; // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        }
        localIPS.push(iface.address);
      });
    });
    const localAddress = localIPS.pop();
    request.get(
      { uri: "http://google.com", localAddress }, // redirects to 'http://google.com'
      (error, response) => {
        assert.deepStrictEqual(error, null);
        assert.deepStrictEqual(response.request.localAddress, localAddress);
        done();
      }
    );
  });
});
