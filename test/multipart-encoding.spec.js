const http = require("http");
const path = require("path");
const request = require("../index");
const assert = require("assert");
const fs = require("fs");

const localFile = path.join(__dirname, "unicycle.jpg");

suite("Multipart encoding", () => {
  const cases = {
    // based on body type
    "+array -stream": {
      options: {
        multipart: [{ name: "field", body: "value" }]
      },
      expected: { chunked: false }
    },
    "+array +stream": {
      options: {
        multipart: [{ name: "file", body: null }]
      },
      expected: { chunked: true }
    },
    // encoding overrides body value
    "+array +encoding": {
      options: {
        headers: { "transfer-encoding": "chunked" },
        multipart: [{ name: "field", body: "value" }]
      },
      expected: { chunked: true }
    },

    // based on body type
    "+object -stream": {
      options: {
        multipart: { data: [{ name: "field", body: "value" }] }
      },
      expected: { chunked: false }
    },
    "+object +stream": {
      options: {
        multipart: { data: [{ name: "file", body: null }] }
      },
      expected: { chunked: true }
    },
    // encoding overrides body value
    "+object +encoding": {
      options: {
        headers: { "transfer-encoding": "chunked" },
        multipart: { data: [{ name: "field", body: "value" }] }
      },
      expected: { chunked: true }
    },

    // based on body type
    "+object -chunked -stream": {
      options: {
        multipart: { chunked: false, data: [{ name: "field", body: "value" }] }
      },
      expected: { chunked: false }
    },
    "+object -chunked +stream": {
      options: {
        multipart: { chunked: false, data: [{ name: "file", body: null }] }
      },
      expected: { chunked: true }
    },
    // chunked overrides body value
    "+object +chunked -stream": {
      options: {
        multipart: { chunked: true, data: [{ name: "field", body: "value" }] }
      },
      expected: { chunked: true }
    },
    // encoding overrides chunked
    "+object +encoding -chunked": {
      options: {
        headers: { "transfer-encoding": "chunked" },
        multipart: { chunked: false, data: [{ name: "field", body: "value" }] }
      },
      expected: { chunked: true }
    }
  };

  Object.keys(cases).forEach(name => {
    test(name, done => {
      const { options, expected } = cases[name];
      const server = http.createServer((request, response) => {
        assert.ok(
          request.headers["content-type"].match(
            /^multipart\/related; boundary=[^\s;]+$/
          )
        );

        if (expected.chunked) {
          assert.ok(request.headers["transfer-encoding"] === "chunked");
          assert.ok(!request.headers["content-length"]);
        } else {
          assert.ok(request.headers["content-length"]);
          assert.ok(!request.headers["transfer-encoding"]);
        }

        // temp workaround
        let data = "";
        request.setEncoding("utf8");

        request.on("data", d => (data += d));

        request.on("end", () => {
          // check for the fields traces
          if (expected.chunked && data.indexOf("name: file") !== -1) {
            // file
            assert.ok(data.indexOf("name: file") !== -1);
            // check for unicycle.jpg traces
            assert.ok(data.indexOf("2005:06:21 01:44:12") !== -1);
          } else {
            // field
            assert.ok(data.indexOf("name: field") !== -1);
            const parts = options.multipart.data || options.multipart;
            assert.ok(data.indexOf(parts[0].body) !== -1);
          }

          response.writeHead(200);
          response.end();
        });
      });

      server.listen(0, () => {
        const url = "http://localhost:" + server.address().port;
        const [part] = options.multipart.data || options.multipart;
        if (part.name === "file") {
          part.body = fs.createReadStream(localFile);
        }

        request.post(url, options, (err, res) => {
          assert.deepStrictEqual(err, null);
          assert.deepStrictEqual(res.statusCode, 200);
          server.close(done);
        });
      });
    });
  });
});
