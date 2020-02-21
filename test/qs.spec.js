const request = require("../index");
const assert = require("assert");

// Run a querystring test.  `options` can have the following keys:
//   - suffix              : a string to be added to the URL
//   - qs                  : an object to be passed to request's `qs` option
//   - qsParseOptions      : an object to be passed to request's `qsParseOptions` option
//   - qsStringifyOptions  : an object to be passed to request's `qsStringifyOptions` option
//   - afterRequest        : a function to execute after creating the request
//   - expected            : the expected path of the request
//   - expectedQuerystring : expected path when using the querystring library

suite("qs", () => {
  function esc(str) {
    return str.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
  }

  const cases = [
    {
      name: "adding a querystring",
      qs: { q: "search" },
      expected: "/?q=search"
    },
    {
      name: "replacing a querystring value",
      suffix: "?q=abc",
      qs: { q: "search" },
      expected: "/?q=search"
    },
    {
      name: "appending a querystring value to the ones present in the uri",
      suffix: "?x=y",
      qs: { q: "search" },
      expected: "/?x=y&q=search"
    },
    { name: "leaving a querystring alone", suffix: "?x=y", expected: "/?x=y" },
    { name: "giving empty qs property", qs: {}, expected: "/" },
    {
      name: "modifying the qs after creating the request",
      qs: {},
      afterRequest: r => r.qs({ q: "test" }),
      expected: "/?q=test"
    },
    {
      name: "a query with an object for a value",
      qs: { where: { foo: "bar" } },
      expected: esc("/?where[foo]=bar"),
      expectedQuerystring: "/?where="
    },
    {
      name: "a query with an array for a value",
      qs: { order: ["bar", "desc"] },
      expected: esc("/?order[0]=bar&order[1]=desc"),
      expectedQuerystring: "/?order=bar&order=desc"
    },
    {
      name: "pass options to the qs module via the qsParseOptions key",
      suffix: "?a=1;b=2",
      qs: {},
      qsParseOptions: { delimiter: ";" },
      qsStringifyOptions: { delimiter: ";" },
      expected: esc("/?a=1;b=2"),
      expectedQuerystring: "/?a=1%3Bb%3D2"
    },
    {
      name: "pass options to the qs module via the qsStringifyOptions key",
      qs: { order: ["bar", "desc"] },
      qsStringifyOptions: { arrayFormat: "brackets" },
      expected: esc("/?order[]=bar&order[]=desc"),
      expectedQuerystring: "/?order=bar&order=desc"
    },
    {
      name: "pass options to the querystring module via the qsParseOptions key",
      suffix: "?a=1;b=2",
      qs: {},
      qsParseOptions: { sep: ";" },
      qsStringifyOptions: { sep: ";" },
      expected: esc("/?a=1%3Bb%3D2"),
      expectedQuerystring: "/?a=1;b=2"
    },
    {
      name:
        "pass options to the querystring module via the qsStringifyOptions key",
      qs: { order: ["bar", "desc"] },
      qsStringifyOptions: { sep: ";" },
      expected: esc("/?order[0]=bar&order[1]=desc"),
      expectedQuerystring: "/?order=bar;order=desc"
    }
  ];

  cases.forEach(({ name, ...options }) => {
    const uri = "http://www.google.com" + (options.suffix || "");
    const opts = {
      uri,
      qsParseOptions: options.qsParseOptions,
      qsStringifyOptions: options.qsStringifyOptions
    };

    if (options.qs) {
      opts.qs = options.qs;
    }

    test(name + " - using qs", done => {
      const req = request.get(opts);
      if (typeof options.afterRequest === "function") {
        options.afterRequest(req);
      }
      process.nextTick(() => {
        assert.deepStrictEqual(req.path, options.expected);
        req.abort();
        done();
      });
    });

    test(name + " - using querystring", done => {
      opts.useQuerystring = true;
      const req = request.get(opts);
      if (typeof options.afterRequest === "function") {
        options.afterRequest(req);
      }
      process.nextTick(() => {
        assert.deepStrictEqual(
          req.path,
          options.expectedQuerystring || options.expected
        );
        req.abort();
        done();
      });
    });
  });
});
