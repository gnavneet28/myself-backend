require("dotenv").config();
const express = require("express");
const winston = require("winston");
const http = require("http");
const os = require("os");
const cluster = require("cluster");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

const numCPUs = os.cpus().length;
let totalInstances = 1;
//let totalInstances = numCPUs > 3 ? 2 : numCPUs;

if (cluster.isPrimary) {
  let workers = [];

  let spawn = function (i) {
    workers[i] = cluster.fork();
  };

  // Register some callbacks to if any worker is ready or die
  cluster.on("fork", function (worker) {
    winston.info("forked worker " + worker.process.pid);
  });

  cluster.on("exit", function (worker, code, signal) {
    winston.info("worker " + worker.process.pid + " died");
  });

  // Spawn workers.
  for (var i = 0; i < totalInstances; i++) {
    spawn(i);
  }
} else {
  require("./startup/logging")();
  require("./startup/routes")(app);
  require("./startup/db")();
  require("./startup/config")();
  require("./startup/validation")();
  require("./startup/prod")(app);
  server.listen(port, () => winston.info(`Listening on port ${port}...`));
}

module.exports = server;
