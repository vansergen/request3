const http = require("http");
const request = require("../index");
const assert = require("assert");

suite("rfc3986", () => {
  const bodyEscaped = "rfc3986=%21%2A%28%29%27";
  const bodyJson = '{"rfc3986":"!*()\'"}';

  const cases = [
    {
      _name: "qs",
      qs: { rfc3986: "!*()'" },
      _expectBody: ""
    },
    {
      _name: "qs + json",
      qs: { rfc3986: "!*()'" },
      json: true,
      _expectBody: ""
    },
    {
      _name: "form",
      form: { rfc3986: "!*()'" },
      _expectBody: bodyEscaped
    },
    {
      _name: "form + json",
      form: { rfc3986: "!*()'" },
      json: true,
      _expectBody: bodyEscaped
    },
    {
      _name: "qs + form",
      qs: { rfc3986: "!*()'" },
      form: { rfc3986: "!*()'" },
      _expectBody: bodyEscaped
    },
    {
      _name: "qs + form + json",
      qs: { rfc3986: "!*()'" },
      form: { rfc3986: "!*()'" },
      json: true,
      _expectBody: bodyEscaped
    },
    {
      _name: "body + header + json",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: "rfc3986=!*()'",
      json: true,
      _expectBody: bodyEscaped
    },
    {
      _name: "body + json",
      body: { rfc3986: "!*()'" },
      json: true,
      _expectBody: bodyJson
    },
    {
      _name: "json object",
      json: { rfc3986: "!*()'" },
      _expectBody: bodyJson
    }
  ];

  const libs = ["qs", "querystring"];

  libs.forEach(lib => {
    cases.forEach(options => {
      options.useQuerystring = lib === "querystring";
      test(lib + " rfc3986 " + options._name, done => {
        const server = http.createServer((request, response) => {
          let data = "";
          request.setEncoding("utf8");

          request.on("data", d => (data += d));

          request.on("end", () => {
            if (options.qs) {
              assert.deepStrictEqual(request.url, "/?rfc3986=%21%2A%28%29%27");
            }
            assert.deepStrictEqual(data, options._expectBody);

            response.writeHead(200);
            response.end("done");
          });
        });

        server.listen(0, () => {
          const { port } = server.address();
          request.post("http://localhost:" + port, options, error => {
            assert.deepStrictEqual(error, null);
            server.close(done);
          });
        });
      });
    });
  });
});
