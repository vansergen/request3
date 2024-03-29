const { hmacsign, hmacsign256, rsasign } = require("oauth-sign");
const qs = require("querystring");
const fs = require("fs");
const path = require("path");
const request = require("../index");
const http = require("http");
const assert = require("assert");

function getSignature(r) {
  let sign;
  r.headers.Authorization.slice("OAuth ".length)
    .replace(/, /g, ",")
    .split(",")
    .forEach(v => {
      if (v.slice(0, 'oauth_signature="'.length) === 'oauth_signature="') {
        sign = v.slice('oauth_signature="'.length, -1);
      }
    });
  return decodeURIComponent(sign);
}

// Tests from Twitter documentation https://dev.twitter.com/docs/auth/oauth
const rsaPrivatePEM = fs.readFileSync(path.join(__dirname, "ssl", "test.key"));

suite("OAuth", () => {
  let reqsign;
  let reqsign256;
  let reqsignRSA;
  let accsign;
  let accsign256;
  let accsignRSA;
  let upsign;
  let upsign256;
  let upsignRSA;

  test("reqsign", done => {
    reqsign = hmacsign(
      "POST",
      "https://api.twitter.com/oauth/request_token",
      {
        oauth_callback:
          "http://localhost:3005/the_dance/process_callback?service_provider_id=11",
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "1272323042",
        oauth_version: "1.0"
      },
      "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
    );

    assert.deepStrictEqual(reqsign, "8wUi7m5HFQy76nowoCThusfgB+Q=");
    done();
  });

  test("reqsign256", done => {
    reqsign256 = hmacsign256(
      "POST",
      "https://api.twitter.com/oauth/request_token",
      {
        oauth_callback:
          "http://localhost:3005/the_dance/process_callback?service_provider_id=11",
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk",
        oauth_signature_method: "HMAC-SHA256",
        oauth_timestamp: "1272323042",
        oauth_version: "1.0"
      },
      "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
    );

    assert.deepStrictEqual(
      reqsign256,
      "N0KBpiPbuPIMx2B77eIg7tNfGNF81iq3bcO9RO6lH+k="
    );
    done();
  });

  test("reqsignRSA", done => {
    reqsignRSA = rsasign(
      "POST",
      "https://api.twitter.com/oauth/request_token",
      {
        oauth_callback:
          "http://localhost:3005/the_dance/process_callback?service_provider_id=11",
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk",
        oauth_signature_method: "RSA-SHA1",
        oauth_timestamp: "1272323042",
        oauth_version: "1.0"
      },
      rsaPrivatePEM,
      "this parameter is not used for RSA signing"
    );

    assert.deepStrictEqual(
      reqsignRSA,
      "MXdzEnIrQco3ACPoVWxCwv5pxYrm5MFRXbsP3LfRV+zfcRr+WMp/dOPS/3r+Wcb+17Z2IK3uJ8dMHfzb5LiDNCTUIj7SWBrbxOpy3Y6SA6z3vcrtjSekkTHLek1j+mzxOi3r3fkbYaNwjHx3PyoFSazbEstnkQQotbITeFt5FBE="
    );
    done();
  });

  test("accsign", done => {
    accsign = hmacsign(
      "POST",
      "https://api.twitter.com/oauth/access_token",
      {
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
        oauth_signature_method: "HMAC-SHA1",
        oauth_token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
        oauth_timestamp: "1272323047",
        oauth_verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
        oauth_version: "1.0"
      },
      "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
      "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA"
    );

    assert.deepStrictEqual(accsign, "PUw/dHA4fnlJYM6RhXk5IU/0fCc=");
    done();
  });

  test("accsign256", done => {
    accsign256 = hmacsign256(
      "POST",
      "https://api.twitter.com/oauth/access_token",
      {
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
        oauth_signature_method: "HMAC-SHA256",
        oauth_token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
        oauth_timestamp: "1272323047",
        oauth_verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
        oauth_version: "1.0"
      },
      "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
      "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA"
    );

    assert.deepStrictEqual(
      accsign256,
      "y7S9eUhA0tC9/YfRzCPqkg3/bUdYRDpZ93Xi51AvhjQ="
    );
    done();
  });

  test("accsignRSA", done => {
    accsignRSA = rsasign(
      "POST",
      "https://api.twitter.com/oauth/access_token",
      {
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
        oauth_signature_method: "RSA-SHA1",
        oauth_token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
        oauth_timestamp: "1272323047",
        oauth_verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
        oauth_version: "1.0"
      },
      rsaPrivatePEM
    );

    assert.deepStrictEqual(
      accsignRSA,
      "gZrMPexdgGMVUl9H6RxK0MbR6Db8tzf2kIIj52kOrDFcMgh4BunMBgUZAO1msUwz6oqZIvkVqyfyDAOP2wIrpYem0mBg3vqwPIroSE1AlUWo+TtQxOTuqrU+3kDcXpdvJe7CAX5hUx9Np/iGRqaCcgByqb9DaCcQ9ViQ+0wJiXI="
    );
    done();
  });

  test("upsign", done => {
    upsign = hmacsign(
      "POST",
      "http://api.twitter.com/1/statuses/update.json",
      {
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "oElnnMTQIZvqvlfXM56aBLAf5noGD0AQR3Fmi7Q6Y",
        oauth_signature_method: "HMAC-SHA1",
        oauth_token: "819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw",
        oauth_timestamp: "1272325550",
        oauth_version: "1.0",
        status: "setting up my twitter 私のさえずりを設定する"
      },
      "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
      "J6zix3FfA9LofH0awS24M3HcBYXO5nI1iYe8EfBA"
    );

    assert.deepStrictEqual(upsign, "yOahq5m0YjDDjfjxHaXEsW9D+X0=");
    done();
  });

  test("upsign256", done => {
    upsign256 = hmacsign256(
      "POST",
      "http://api.twitter.com/1/statuses/update.json",
      {
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "oElnnMTQIZvqvlfXM56aBLAf5noGD0AQR3Fmi7Q6Y",
        oauth_signature_method: "HMAC-SHA256",
        oauth_token: "819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw",
        oauth_timestamp: "1272325550",
        oauth_version: "1.0",
        status: "setting up my twitter 私のさえずりを設定する"
      },
      "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
      "J6zix3FfA9LofH0awS24M3HcBYXO5nI1iYe8EfBA"
    );

    assert.deepStrictEqual(
      upsign256,
      "xYhKjozxc3NYef7C26WU+gORdhEURdZRxSDzRttEKH0="
    );
    done();
  });

  test("upsignRSA", done => {
    upsignRSA = rsasign(
      "POST",
      "http://api.twitter.com/1/statuses/update.json",
      {
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "oElnnMTQIZvqvlfXM56aBLAf5noGD0AQR3Fmi7Q6Y",
        oauth_signature_method: "RSA-SHA1",
        oauth_token: "819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw",
        oauth_timestamp: "1272325550",
        oauth_version: "1.0",
        status: "setting up my twitter 私のさえずりを設定する"
      },
      rsaPrivatePEM
    );

    assert.deepStrictEqual(
      upsignRSA,
      "fF4G9BNzDxPu/htctzh9CWzGhtXo9DYYl+ZyRO1/QNOhOZPqnWVUOT+CGUKxmAeJSzLKMAH8y/MFSHI0lzihqwgfZr7nUhTx6kH7lUChcVasr+TZ4qPqvGGEhfJ8Av8D5dF5fytfCSzct62uONU0iHYVqainP+zefk1K7Ptb6hI="
    );
    done();
  });

  test("rsign", done => {
    const rsign = request.post({
      url: "https://api.twitter.com/oauth/request_token",
      oauth: {
        callback:
          "http://localhost:3005/the_dance/process_callback?service_provider_id=11",
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk",
        timestamp: "1272323042",
        version: "1.0",
        consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
      }
    });

    process.nextTick(() => {
      assert.deepStrictEqual(reqsign, getSignature(rsign));
      rsign.abort();
      done();
    });
  });

  test("rsign_rsa", done => {
    const rsignRSA = request.post({
      url: "https://api.twitter.com/oauth/request_token",
      oauth: {
        callback:
          "http://localhost:3005/the_dance/process_callback?service_provider_id=11",
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk",
        timestamp: "1272323042",
        version: "1.0",
        private_key: rsaPrivatePEM,
        signature_method: "RSA-SHA1"
      }
    });

    process.nextTick(() => {
      assert.deepStrictEqual(reqsignRSA, getSignature(rsignRSA));
      rsignRSA.abort();
      done();
    });
  });

  test("raccsign", done => {
    const raccsign = request.post({
      url: "https://api.twitter.com/oauth/access_token",
      oauth: {
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
        signature_method: "HMAC-SHA1",
        token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
        timestamp: "1272323047",
        verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
        version: "1.0",
        consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
        token_secret: "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA"
      }
    });

    process.nextTick(() => {
      assert.deepStrictEqual(accsign, getSignature(raccsign));
      raccsign.abort();
      done();
    });
  });

  test("raccsignRSA", done => {
    const raccsignRSA = request.post({
      url: "https://api.twitter.com/oauth/access_token",
      oauth: {
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
        signature_method: "RSA-SHA1",
        token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
        timestamp: "1272323047",
        verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
        version: "1.0",
        private_key: rsaPrivatePEM,
        token_secret: "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA"
      }
    });

    process.nextTick(() => {
      assert.deepStrictEqual(accsignRSA, getSignature(raccsignRSA));
      raccsignRSA.abort();
      done();
    });
  });

  test("rupsign", done => {
    const rupsign = request.post({
      url: "http://api.twitter.com/1/statuses/update.json",
      oauth: {
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "oElnnMTQIZvqvlfXM56aBLAf5noGD0AQR3Fmi7Q6Y",
        signature_method: "HMAC-SHA1",
        token: "819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw",
        timestamp: "1272325550",
        version: "1.0",
        consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
        token_secret: "J6zix3FfA9LofH0awS24M3HcBYXO5nI1iYe8EfBA"
      },
      form: { status: "setting up my twitter 私のさえずりを設定する" }
    });
    process.nextTick(() => {
      assert.deepStrictEqual(upsign, getSignature(rupsign));
      rupsign.abort();
      done();
    });
  });

  test("rupsignRSA", done => {
    const rupsignRSA = request.post({
      url: "http://api.twitter.com/1/statuses/update.json",
      oauth: {
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "oElnnMTQIZvqvlfXM56aBLAf5noGD0AQR3Fmi7Q6Y",
        signature_method: "RSA-SHA1",
        token: "819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw",
        timestamp: "1272325550",
        version: "1.0",
        private_key: rsaPrivatePEM,
        token_secret: "J6zix3FfA9LofH0awS24M3HcBYXO5nI1iYe8EfBA"
      },
      form: { status: "setting up my twitter 私のさえずりを設定する" }
    });
    process.nextTick(() => {
      assert.deepStrictEqual(upsignRSA, getSignature(rupsignRSA));
      rupsignRSA.abort();
      done();
    });
  });

  test("rfc5849 example", done => {
    const rfc5849 = request.post({
      url: "http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
      oauth: {
        consumer_key: "9djdj82h48djs9d2",
        nonce: "7d8f3e4a",
        signature_method: "HMAC-SHA1",
        token: "kkk9d7dh3k39sjv7",
        timestamp: "137131201",
        consumer_secret: "j49sk3j29djd",
        token_secret: "dh893hdasih9",
        realm: "Example"
      },
      form: {
        c2: "",
        a3: "2 q"
      }
    });

    process.nextTick(() => {
      // different signature in rfc5849 because request sets oauth_version by default
      assert.deepStrictEqual(
        "OB33pYjWAnf+xtOHN4Gmbdil168=",
        getSignature(rfc5849)
      );
      rfc5849.abort();
      done();
    });
  });

  test("rfc5849 RSA example", done => {
    const rfc5849RSA = request.post({
      url: "http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
      oauth: {
        consumer_key: "9djdj82h48djs9d2",
        nonce: "7d8f3e4a",
        signature_method: "RSA-SHA1",
        token: "kkk9d7dh3k39sjv7",
        timestamp: "137131201",
        private_key: rsaPrivatePEM,
        token_secret: "dh893hdasih9",
        realm: "Example"
      },
      form: {
        c2: "",
        a3: "2 q"
      }
    });

    process.nextTick(() => {
      // different signature in rfc5849 because request sets oauth_version by default
      assert.deepStrictEqual(
        "ThNYfZhYogcAU6rWgI3ZFlPEhoIXHMZcuMzl+jykJZW/ab+AxyefS03dyd64CclIZ0u8JEW64TQ5SHthoQS8aM8qir4t+t88lRF3LDkD2KtS1krgCZTUQxkDL5BO5pxsqAQ2Zfdcrzaxb6VMGD1Hf+Pno+fsHQo/UUKjq4V3RMo=",
        getSignature(rfc5849RSA)
      );
      rfc5849RSA.abort();
      done();
    });
  });

  test("plaintext signature method", done => {
    const plaintext = request.post({
      url: "https://dummy.com",
      oauth: {
        consumer_secret: "consumer_secret",
        token_secret: "token_secret",
        signature_method: "PLAINTEXT"
      }
    });

    process.nextTick(() => {
      assert.deepStrictEqual(
        "consumer_secret&token_secret",
        getSignature(plaintext)
      );
      plaintext.abort();
      done();
    });
  });

  test("invalid transport_method", done => {
    assert.throws(() => {
      request.post({
        url: "http://example.com/",
        oauth: { transport_method: "headerquery" }
      });
    }, /transport_method invalid/);
    done();
  });

  test("invalid method while using transport_method 'body'", done => {
    assert.throws(() => {
      request.get({
        url: "http://example.com/",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        oauth: { transport_method: "body" }
      });
    }, /requires POST/);
    done();
  });

  test("invalid content-type while using transport_method 'body'", done => {
    assert.throws(() => {
      request.post({
        url: "http://example.com/",
        headers: { "content-type": "application/json; charset=UTF-8" },
        oauth: { transport_method: "body" }
      });
    }, /requires POST/);
    done();
  });

  test("query transport_method", done => {
    const r = request.post({
      url: "https://api.twitter.com/oauth/access_token",
      oauth: {
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
        signature_method: "HMAC-SHA1",
        token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
        timestamp: "1272323047",
        verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
        version: "1.0",
        consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
        token_secret: "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA",
        transport_method: "query"
      }
    });

    process.nextTick(() => {
      assert.ok(
        !r.headers.Authorization,
        "oauth Authorization header should not be present with transport_method 'query'"
      );
      assert.deepStrictEqual(
        r.uri.pathname + r.uri.search,
        r.path,
        "r.uri.pathname + r.uri.search should equal r.path"
      );
      assert.ok(
        r.path.match(/^\/oauth\/access_token\?/),
        "path should contain path + query"
      );
      assert.deepStrictEqual(
        { ...qs.parse(r.uri.searchParams.toString()) },
        {
          oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
          oauth_nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
          oauth_signature_method: "HMAC-SHA1",
          oauth_timestamp: "1272323047",
          oauth_token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
          oauth_verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
          oauth_version: "1.0",
          oauth_signature: accsign
        }
      );
      r.abort();
      done();
    });
  });

  test("query transport_method + form option + url params", done => {
    const r = request.post({
      url: "http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
      oauth: {
        consumer_key: "9djdj82h48djs9d2",
        nonce: "7d8f3e4a",
        signature_method: "HMAC-SHA1",
        token: "kkk9d7dh3k39sjv7",
        timestamp: "137131201",
        consumer_secret: "j49sk3j29djd",
        token_secret: "dh893hdasih9",
        realm: "Example",
        transport_method: "query"
      },
      form: {
        c2: "",
        a3: "2 q"
      }
    });

    process.nextTick(() => {
      assert.ok(
        !r.headers.Authorization,
        "oauth Authorization header should not be present with transport_method 'query'"
      );
      assert.deepStrictEqual(
        r.uri.pathname + r.uri.search,
        r.path,
        "r.uri.pathname + r.uri.search should equal r.path"
      );
      assert.ok(
        r.path.match(/^\/request\?/),
        "path should contain path + query"
      );
      assert.deepStrictEqual(
        { ...qs.parse(r.uri.searchParams.toString()) },
        {
          b5: "=%3D",
          a3: "a",
          "c@": "",
          a2: "r b",
          realm: "Example",
          oauth_consumer_key: "9djdj82h48djs9d2",
          oauth_nonce: "7d8f3e4a",
          oauth_signature_method: "HMAC-SHA1",
          oauth_timestamp: "137131201",
          oauth_token: "kkk9d7dh3k39sjv7",
          oauth_version: "1.0",
          oauth_signature: "OB33pYjWAnf+xtOHN4Gmbdil168="
        }
      );
      r.abort();
      done();
    });
  });

  test("query transport_method + qs option + url params", done => {
    const r = request.post({
      url: "http://example.com/request?a2=r%20b",
      oauth: {
        consumer_key: "9djdj82h48djs9d2",
        nonce: "7d8f3e4a",
        signature_method: "HMAC-SHA1",
        token: "kkk9d7dh3k39sjv7",
        timestamp: "137131201",
        consumer_secret: "j49sk3j29djd",
        token_secret: "dh893hdasih9",
        realm: "Example",
        transport_method: "query"
      },
      qs: {
        b5: "=%3D",
        a3: ["a", "2 q"],
        "c@": "",
        c2: ""
      }
    });

    process.nextTick(() => {
      assert.ok(
        !r.headers.Authorization,
        "oauth Authorization header should not be present with transport_method 'query'"
      );
      assert.deepStrictEqual(
        r.uri.pathname + r.uri.search,
        r.path,
        "r.uri.pathname + r.uri.search should equal r.path"
      );
      assert.ok(
        r.path.match(/^\/request\?/),
        "path should contain path + query"
      );
      assert.deepStrictEqual(
        { ...qs.parse(r.uri.searchParams.toString()) },
        {
          a2: "r b",
          b5: "=%3D",
          "a3[0]": "a",
          "a3[1]": "2 q",
          "c@": "",
          c2: "",
          realm: "Example",
          oauth_consumer_key: "9djdj82h48djs9d2",
          oauth_nonce: "7d8f3e4a",
          oauth_signature_method: "HMAC-SHA1",
          oauth_timestamp: "137131201",
          oauth_token: "kkk9d7dh3k39sjv7",
          oauth_version: "1.0",
          oauth_signature: "OB33pYjWAnf+xtOHN4Gmbdil168="
        }
      );
      r.abort();
      done();
    });
  });

  test("body transport_method", done => {
    const r = request.post({
      url: "https://api.twitter.com/oauth/access_token",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      oauth: {
        consumer_key: "GDdmIQH6jhtmLUypg82g",
        nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
        signature_method: "HMAC-SHA1",
        token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
        timestamp: "1272323047",
        verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
        version: "1.0",
        consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98",
        token_secret: "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA",
        transport_method: "body"
      }
    });

    process.nextTick(() => {
      assert.ok(
        !r.headers.Authorization,
        "oauth Authorization header should not be present with transport_method 'body'"
      );
      assert.deepStrictEqual(
        { ...qs.parse(r.body) },
        {
          oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
          oauth_nonce: "9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8",
          oauth_signature_method: "HMAC-SHA1",
          oauth_timestamp: "1272323047",
          oauth_token: "8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc",
          oauth_verifier: "pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY",
          oauth_version: "1.0",
          oauth_signature: accsign
        }
      );
      r.abort();
      done();
    });
  });

  test("body transport_method + form option + url params", done => {
    const r = request.post({
      url: "http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
      oauth: {
        consumer_key: "9djdj82h48djs9d2",
        nonce: "7d8f3e4a",
        signature_method: "HMAC-SHA1",
        token: "kkk9d7dh3k39sjv7",
        timestamp: "137131201",
        consumer_secret: "j49sk3j29djd",
        token_secret: "dh893hdasih9",
        realm: "Example",
        transport_method: "body"
      },
      form: {
        c2: "",
        a3: "2 q"
      }
    });

    process.nextTick(() => {
      assert.ok(
        !r.headers.Authorization,
        "oauth Authorization header should not be present with transport_method 'body'"
      );
      assert.deepStrictEqual(
        { ...qs.parse(r.body) },
        {
          c2: "",
          a3: "2 q",
          realm: "Example",
          oauth_consumer_key: "9djdj82h48djs9d2",
          oauth_nonce: "7d8f3e4a",
          oauth_signature_method: "HMAC-SHA1",
          oauth_timestamp: "137131201",
          oauth_token: "kkk9d7dh3k39sjv7",
          oauth_version: "1.0",
          oauth_signature: "OB33pYjWAnf+xtOHN4Gmbdil168="
        }
      );
      r.abort();
      done();
    });
  });

  test("body_hash manually set", done => {
    const r = request.post({
      url: "http://example.com",
      oauth: {
        consumer_secret: "consumer_secret",
        body_hash: "ManuallySetHash"
      },
      json: { foo: "bar" }
    });

    process.nextTick(() => {
      const hash = r.headers.Authorization.replace(
        /.*oauth_body_hash="([^"]+)".*/,
        "$1"
      );
      assert.deepStrictEqual("ManuallySetHash", hash);
      r.abort();
      done();
    });
  });

  test("body_hash automatically built for string", done => {
    const r = request.post({
      url: "http://example.com",
      oauth: {
        consumer_secret: "consumer_secret",
        body_hash: true
      },
      body: "Hello World!"
    });

    process.nextTick(() => {
      const hash = r.headers.Authorization.replace(
        /.*oauth_body_hash="([^"]+)".*/,
        "$1"
      );
      // from https://tools.ietf.org/id/draft-eaton-oauth-bodyhash-00.html#anchor15
      assert.deepStrictEqual("Lve95gjOVATpfV8EL5X4nxwjKHE%3D", hash);
      r.abort();
      done();
    });
  });

  test("body_hash automatically built for JSON", done => {
    const r = request.post({
      url: "http://example.com",
      oauth: {
        consumer_secret: "consumer_secret",
        body_hash: true
      },
      json: { foo: "bar" }
    });

    process.nextTick(() => {
      const hash = r.headers.Authorization.replace(
        /.*oauth_body_hash="([^"]+)".*/,
        "$1"
      );
      assert.deepStrictEqual("pedE0BZFQNM7HX6mFsKPL6l%2BdUo%3D", hash);
      r.abort();
      done();
    });
  });

  test("body_hash PLAINTEXT signature_method", done => {
    assert.throws(() => {
      request.post({
        url: "http://example.com",
        oauth: {
          consumer_secret: "consumer_secret",
          body_hash: true,
          signature_method: "PLAINTEXT"
        },
        json: { foo: "bar" }
      });
    }, /oauth: PLAINTEXT signature_method not supported with body_hash signing/);
    done();
  });

  test("refresh oauth_nonce on redirect", done => {
    let oauthNonce1;
    let oauthNonce2;
    let url;
    const s = http.createServer((req, res) => {
      if (req.url === "/redirect") {
        oauthNonce1 = req.headers.authorization.replace(
          /.*oauth_nonce="([^"]+)".*/,
          "$1"
        );
        res.writeHead(302, { location: url + "/response" });
        res.end();
      } else if (req.url === "/response") {
        oauthNonce2 = req.headers.authorization.replace(
          /.*oauth_nonce="([^"]+)".*/,
          "$1"
        );
        res.writeHead(200, { "content-type": "text/plain" });
        res.end();
      }
    });
    s.listen(0, () => {
      url = "http://localhost:" + s.address().port;
      request.get(
        {
          url: url + "/redirect",
          oauth: {
            consumer_key: "consumer_key",
            consumer_secret: "consumer_secret",
            token: "token",
            token_secret: "token_secret"
          }
        },
        err => {
          assert.deepStrictEqual(err, null);
          assert.notDeepStrictEqual(oauthNonce1, oauthNonce2);
          s.close(() => {
            done();
          });
        }
      );
    });
  });

  test("no credentials on external redirect", done => {
    const s2 = http.createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end();
    });
    const s1 = http.createServer((req, res) => {
      res.writeHead(302, { location: s2.url });
      res.end();
    });
    s1.listen(0, () => {
      s1.url = "http://localhost:" + s1.address().port;
      s2.listen(0, () => {
        s2.url = "http://127.0.0.1:" + s2.address().port;
        request.get(
          {
            url: s1.url,
            oauth: {
              consumer_key: "consumer_key",
              consumer_secret: "consumer_secret",
              token: "token",
              token_secret: "token_secret"
            }
          },
          (err, res) => {
            assert.deepStrictEqual(err, null);
            assert.deepStrictEqual(
              res.request.headers.Authorization,
              undefined
            );
            s1.close(() => s2.close(done));
          }
        );
      });
    });
  });
});
