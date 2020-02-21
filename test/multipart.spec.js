const request = require("../index");
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const http = require("http");

suite("Multipart", () => {
  const testHeaders = [
    null,
    "multipart/mixed",
    "multipart/related; boundary=XXX; type=text/xml; start=\"<root>\""
  ];

  const methods = ["post", "get"];
  methods.forEach(method => {
    testHeaders.forEach(header => {
      [true, false].forEach(json => {
        const name = [
          "multipart-related",
          method.toUpperCase(),
          header || "default",
          (json ? "+" : "-") + "json"
        ].join(" ");

        test(name, done => {
          const remoteFile = path.join(__dirname, "googledoodle.jpg");
          const localFile = path.join(__dirname, "unicycle.jpg");
          let multipartData = [];

          const server = http.createServer((req, res) => {
            if (req.url === "/file") {
              res.writeHead(200, { "content-type": "image/jpg" });
              res.end(fs.readFileSync(remoteFile), "binary");
              return;
            }

            if (header) {
              if (header.indexOf("mixed") !== -1) {
                assert.ok(
                  req.headers["content-type"].match(
                    /^multipart\/mixed; boundary=[^\s;]+$/
                  )
                );
              } else {
                assert.ok(
                  req.headers["content-type"].match(
                    /^multipart\/related; boundary=XXX; type=text\/xml; start="<root>"$/
                  )
                );
              }
            } else {
              assert.ok(
                req.headers["content-type"].match(
                  /^multipart\/related; boundary=[^\s;]+$/
                )
              );
            }

            // temp workaround
            let data = "";
            req.setEncoding("utf8");

            req.on("data", d => {
              data += d;
            });

            req.on("end", () => {
              // check for the fields traces

              // my_field
              assert.ok(data.indexOf("name: my_field") !== -1);
              assert.ok(data.indexOf(multipartData[0].body) !== -1);

              // my_number
              assert.ok(data.indexOf("name: my_number") !== -1);
              assert.ok(data.indexOf(multipartData[1].body) !== -1);

              // my_buffer
              assert.ok(data.indexOf("name: my_buffer") !== -1);
              assert.ok(data.indexOf(multipartData[2].body) !== -1);

              // my_file
              assert.ok(data.indexOf("name: my_file") !== -1);
              // check for unicycle.jpg traces
              assert.ok(data.indexOf("2005:06:21 01:44:12") !== -1);

              // remote_file
              assert.ok(data.indexOf("name: remote_file") !== -1);
              // check for http://localhost:nnnn/file traces
              assert.ok(data.indexOf("Photoshop ICC") !== -1);

              if (header && header.indexOf("boundary=XXX") !== -1) {
                assert.ok(data.indexOf("--XXX") !== -1);
              }

              res.writeHead(200);
              res.end(json ? JSON.stringify({ status: "done" }) : "done");
            });
          });

          server.listen(0, () => {
            const url = "http://localhost:" + server.address().port;
            multipartData = [
              { name: "my_field", body: "my_value" },
              { name: "my_number", body: 1000 },
              { name: "my_buffer", body: Buffer.from([1, 2, 3]) },
              { name: "my_file", body: fs.createReadStream(localFile) },
              { name: "remote_file", body: request(url + "/file") }
            ];

            const reqOptions = {
              url: url + "/upload",
              multipart: multipartData
            };
            if (header) {
              reqOptions.headers = { "content-type": header };
            }
            if (json) {
              reqOptions.json = true;
            }
            request[method](reqOptions, (err, res, body) => {
              assert.deepStrictEqual(err, null);
              assert.deepStrictEqual(res.statusCode, 200);
              assert.deepStrictEqual(body, json ? { status: "done" } : "done");
              server.close(done);
            });
          });
        });
      });
    });
  });
});
