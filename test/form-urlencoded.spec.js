const http = require("http");
const request = require("../index");
const assert = require("assert");

suite("Form urlencoded", () => {
  const cases = [
    {
      form: { some: "url", encoded: "data" },
      json: true
    },
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      form: { some: "url", encoded: "data" },
      json: true
    },
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: "some=url&encoded=data",
      json: true
    },
    {
      // body set via .form() method
      json: true
    }
  ];

  cases.forEach((options, index) => {
    test("application/x-www-form-urlencoded " + index, done => {
      const server = http.createServer((req, res) => {
        if (index === 0 || index === 3) {
          assert.deepStrictEqual(
            req.headers["content-type"],
            "application/x-www-form-urlencoded"
          );
        } else {
          assert.deepStrictEqual(
            req.headers["content-type"],
            "application/x-www-form-urlencoded; charset=UTF-8"
          );
        }
        assert.deepStrictEqual(req.headers["content-length"], "21");
        assert.deepStrictEqual(req.headers.accept, "application/json");

        let data = "";
        req.setEncoding("utf8");

        req.on("data", d => (data += d));

        req.on("end", () => {
          assert.deepStrictEqual(data, "some=url&encoded=data");
          res.writeHead(200);
          res.end("done");
        });
      });

      server.listen(0, () => {
        const url = "http://localhost:" + server.address().port;
        const req = request.post(url, options, (err, res, body) => {
          assert.deepStrictEqual(err, null);
          assert.deepStrictEqual(res.statusCode, 200);
          assert.deepStrictEqual(body, "done");
          server.close(done);
        });
        if (!options.form && !options.body) {
          req.form({ some: "url", encoded: "data" });
        }
      });
    });
  });
});
