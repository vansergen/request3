const http = require("http");
const path = require("path");
const mime = require("mime-types");
const request = require("../index");
const fs = require("fs");
const assert = require("assert");

suite("Form", () => {
  test("multipart form append", done => {
    const remoteFile = path.join(__dirname, "googledoodle.jpg");
    const localFile = path.join(__dirname, "unicycle.jpg");
    let totalLength = null;
    let FIELDS = [];

    const server = http.createServer((req, res) => {
      if (req.url === "/file") {
        res.writeHead(200, {
          "content-type": "image/jpg",
          "content-length": 7187
        });
        res.end(fs.readFileSync(remoteFile), "binary");
        return;
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
        let field;
        // check for the fields' traces

        // 1st field : my_field
        field = FIELDS.shift();
        assert.ok(data.indexOf("form-data; name=\"" + field.name + "\"") !== -1);
        assert.ok(data.indexOf(field.value) !== -1);

        // 2nd field : my_buffer
        field = FIELDS.shift();
        assert.ok(data.indexOf("form-data; name=\"" + field.name + "\"") !== -1);
        assert.ok(data.indexOf(field.value) !== -1);

        // 3rd field : my_file
        field = FIELDS.shift();
        assert.ok(data.indexOf("form-data; name=\"" + field.name + "\"") !== -1);
        assert.ok(
          data.indexOf(
            "; filename=\"" + path.basename(field.value.path) + "\""
          ) !== -1
        );
        // check for unicycle.jpg traces
        assert.ok(data.indexOf("2005:06:21 01:44:12") !== -1);
        assert.ok(
          data.indexOf("Content-Type: " + mime.lookup(field.value.path)) !== -1
        );

        // 4th field : remote_file
        field = FIELDS.shift();
        assert.ok(data.indexOf("form-data; name=\"" + field.name + "\"") !== -1);
        assert.ok(
          data.indexOf(
            "; filename=\"" + path.basename(field.value.path) + "\""
          ) !== -1
        );
        // check for http://localhost:nnnn/file traces
        assert.ok(data.indexOf("Photoshop ICC") !== -1);
        assert.ok(
          data.indexOf("Content-Type: " + mime.lookup(remoteFile)) !== -1
        );

        assert.ok(+req.headers["content-length"] === totalLength);

        res.writeHead(200);
        res.end("done");

        assert.deepStrictEqual(FIELDS.length, 0);
      });
    });

    server.listen(0, () => {
      const url = "http://localhost:" + server.address().port;
      FIELDS = [
        { name: "my_field", value: "my_value" },
        { name: "my_buffer", value: Buffer.from([1, 2, 3]) },
        { name: "my_file", value: fs.createReadStream(localFile) },
        { name: "remote_file", value: request(url + "/file") }
      ];

      const req = request.post(url + "/upload", (err, res, body) => {
        assert.deepStrictEqual(err, null);
        assert.deepStrictEqual(res.statusCode, 200);
        assert.deepStrictEqual(body, "done");
        server.close(done);
      });
      const form = req.form();

      FIELDS.forEach(field => form.append(field.name, field.value));

      form.getLength((err, length) => {
        assert.deepStrictEqual(err, null);
        totalLength = length;
      });
    });
  });
});
