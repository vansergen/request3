const { createServer, createPostJSONValidator } = require("./lib/server");
const request = require("../index");
const assert = require("assert");

const server = createServer();

suite("JSON request", () => {
  suiteSetup(done => server.listen(0, done));

  const jsonValues = [
    { name: "Null", value: null },
    { name: "True", value: true },
    { name: "False", value: false },
    { name: "Number", value: -289365.2938 },
    { name: "String", value: "some string" },
    {
      name: "Array",
      value: [
        "value1",
        2,
        null,
        8925.53289,
        true,
        false,
        ["array"],
        { object: "property" }
      ]
    },
    {
      name: "Object",
      value: {
        trueProperty: true,
        falseProperty: false,
        numberProperty: -98346.34698,
        stringProperty: "string",
        nullProperty: null,
        arrayProperty: ["array"],
        objectProperty: { object: "property" }
      }
    }
  ];

  jsonValues.forEach(({ name, value }) => {
    test("test " + name, done => {
      const testUrl = "/" + name;
      server.on(testUrl, createPostJSONValidator(value, "application/json"));
      const opts = {
        method: "PUT",
        uri: server.url + testUrl,
        json: true,
        body: value
      };
      request(opts, (err, resp, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(resp.statusCode, 200);
        assert.deepStrictEqual(body, value);
        done();
      });
    });
  });

  const jsonValueRevivers = [
    {
      name: "jsonReviver",
      value: -48269.592,
      reviver: (k, v) => v * -1,
      revivedValue: 48269.592
    },
    {
      name: "jsonReviverInvalid",
      value: -48269.592,
      reviver: "invalid reviver",
      revivedValue: -48269.592
    }
  ];

  jsonValueRevivers.forEach(({ name, value, reviver, revivedValue }) => {
    test("test " + name, done => {
      const testUrl = "/" + name;
      server.on(testUrl, createPostJSONValidator(value, "application/json"));
      const opts = {
        method: "PUT",
        uri: server.url + testUrl,
        json: true,
        jsonReviver: reviver,
        body: value
      };
      request(opts, (err, resp, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(resp.statusCode, 200);
        assert.deepStrictEqual(body, revivedValue);
        done();
      });
    });
  });

  const jsonValueReplacers = [
    {
      name: "jsonReplacer",
      value: -48269.592,
      replacer: (k, v) => v * -1,
      replacedValue: 48269.592
    },
    {
      name: "jsonReplacerInvalid",
      value: -48269.592,
      replacer: "invalid replacer",
      replacedValue: -48269.592
    },
    {
      name: "jsonReplacerObject",
      value: { foo: "bar" },
      replacer: (k, v) => (v.toUpperCase ? v.toUpperCase() : v),
      replacedValue: { foo: "BAR" }
    }
  ];

  jsonValueReplacers.forEach(({ name, value, replacer, replacedValue }) => {
    test("test " + name, done => {
      const testUrl = "/" + name;
      server.on(
        testUrl,
        createPostJSONValidator(replacedValue, "application/json")
      );
      const opts = {
        method: "PUT",
        uri: server.url + testUrl,
        json: true,
        jsonReplacer: replacer,
        body: value
      };
      request(opts, (err, resp, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(resp.statusCode, 200);
        assert.deepStrictEqual(body, replacedValue);
        done();
      });
    });
  });

  test("missing body", done => {
    server.on("/missing-body", (req, res) => {
      assert.deepStrictEqual(req.headers["content-type"], undefined);
      res.end();
    });
    request({ url: server.url + "/missing-body", json: true }, done);
  });

  suiteTeardown(done => server.close(done));
});
