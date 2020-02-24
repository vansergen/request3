"use strict";
const { spawn } = require("child_process");
const https = require("https");
const fs = require("fs");
const path = require("path");

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, "/ssl/server.key")),
    cert: fs.readFileSync(path.join(__dirname, "/ssl/server.crt")),
    ca: fs.readFileSync(path.join(__dirname, "/ssl/ca.crt")),
    requestCert: true,
    rejectUnauthorized: false
  },
  (request, response) => {
    // Set CORS header, since that is something we are testing.
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.writeHead(200);
    response.end(
      "Can you hear the sound of an enormous door slamming in the depths of hell?\n"
    );
  }
);
server.listen(0, function() {
  const { port } = this.address();
  console.log("Started https server for karma tests on port " + port);
  // Spawn process for karma.
  const c = spawn("karma", [
    "start",
    path.join(__dirname, "/karma.conf.js"),
    "https://localhost:" + port
  ]);
  c.stdout.pipe(process.stdout);
  c.stderr.pipe(process.stderr);
  c.on("exit", code => {
    // Exit process with karma exit code.
    if (code !== 0) {
      throw new Error("Karma exited with status code " + c);
    }
    server.close();
  });
});
