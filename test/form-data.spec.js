const http = require("http");
const path = require("path");
const mime = require("mime-types");
const request = require("../index");
const fs = require("fs");
const assert = require("assert");

suite("FormData", () => {
  const cases = [
    { name: "multipart formData", json: false },
    { name: "multipart formData + JSON", json: true },
    { name: "multipart formData + basic auth", json: false, auth: true }
  ];

  cases.forEach(({ name, ...options }) => {
    test(name, done => {
      {
        const remoteFile = path.join(__dirname, "googledoodle.jpg");
        const localFile = path.join(__dirname, "unicycle.jpg");
        const multipartFormData = {};

        const server = http.createServer((req, res) => {
          if (req.url === "/file") {
            res.writeHead(200, {
              "content-type": "image/jpg",
              "content-length": 7187
            });
            res.end(fs.readFileSync(remoteFile), "binary");
            return;
          }

          if (options.auth) {
            if (!req.headers.authorization) {
              res.writeHead(401, {
                "www-authenticate": 'Basic realm="Private"'
              });
              res.end();
              return;
            } else {
              assert.ok(
                req.headers.authorization ===
                  "Basic " + Buffer.from("user:pass").toString("base64")
              );
            }
          }

          assert.ok(
            /multipart\/form-data; boundary=--------------------------\d+/.test(
              req.headers["content-type"]
            )
          );

          // temp workaround
          let data = "";
          req.setEncoding("utf8");

          req.on("data", d => (data += d));

          req.on("end", () => {
            // check for the fields' traces

            // 1st field : my_field
            assert.ok(data.indexOf('form-data; name="my_field"') !== -1);
            assert.ok(data.indexOf(multipartFormData.my_field) !== -1);

            // 2nd field : my_buffer
            assert.ok(data.indexOf('form-data; name="my_buffer"') !== -1);
            assert.ok(data.indexOf(multipartFormData.my_buffer) !== -1);

            // 3rd field : my_file
            assert.ok(data.indexOf('form-data; name="my_file"') !== -1);
            assert.ok(
              data.indexOf(
                '; filename="' +
                  path.basename(multipartFormData.my_file.path) +
                  '"'
              ) !== -1
            );
            // check for unicycle.jpg traces
            assert.ok(data.indexOf("2005:06:21 01:44:12") !== -1);
            assert.ok(
              data.indexOf(
                "Content-Type: " + mime.lookup(multipartFormData.my_file.path)
              ) !== -1
            );

            // 4th field : remote_file
            assert.ok(data.indexOf('form-data; name="remote_file"') !== -1);
            assert.ok(
              data.indexOf(
                '; filename="' +
                  path.basename(multipartFormData.remote_file.path) +
                  '"'
              ) !== -1
            );

            // 5th field : file with metadata
            assert.ok(data.indexOf('form-data; name="secret_file"') !== -1);
            assert.ok(
              data.indexOf(
                'Content-Disposition: form-data; name="secret_file"; filename="topsecret.jpg"'
              ) !== -1
            );
            assert.ok(data.indexOf("Content-Type: image/custom") !== -1);

            // 6th field : batch of files
            assert.ok(data.indexOf('form-data; name="batch"') !== -1);
            assert.ok(data.match(/form-data; name="batch"/g).length === 2);

            // check for http://localhost:nnnn/file traces
            assert.ok(data.indexOf("Photoshop ICC") !== -1);
            assert.ok(
              data.indexOf("Content-Type: " + mime.lookup(remoteFile)) !== -1
            );

            res.writeHead(200);
            res.end(options.json ? JSON.stringify({ status: "done" }) : "done");
          });
        });

        server.listen(0, () => {
          const url = "http://localhost:" + server.address().port;
          // @NOTE: multipartFormData properties must be set here so that my_file read stream does not leak in node v0.8
          multipartFormData.my_field = "my_value";
          multipartFormData.my_buffer = Buffer.from([1, 2, 3]);
          multipartFormData.my_file = fs.createReadStream(localFile);
          multipartFormData.remote_file = request(url + "/file");
          multipartFormData.secret_file = {
            value: fs.createReadStream(localFile),
            options: { filename: "topsecret.jpg", contentType: "image/custom" }
          };
          multipartFormData.batch = [
            fs.createReadStream(localFile),
            fs.createReadStream(localFile)
          ];

          const reqOptions = {
            url: url + "/upload",
            formData: multipartFormData
          };
          if (options.json) {
            reqOptions.json = true;
          }
          if (options.auth) {
            reqOptions.auth = {
              user: "user",
              pass: "pass",
              sendImmediately: false
            };
          }
          request.post(reqOptions, (err, res, body) => {
            assert.deepStrictEqual(err, null);
            assert.deepStrictEqual(res.statusCode, 200);
            assert.deepStrictEqual(
              body,
              options.json ? { status: "done" } : "done"
            );
            server.close(done);
          });
        });
      }
    });
  });
});
