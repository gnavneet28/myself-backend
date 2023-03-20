const express = require("express");
const error = require("../middleware/error");
const personas = require("../routes/personas");
const users = require("../routes/users");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

module.exports = (app) => {
  app.use(express.json({ limit: "100mb" }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: [
        "https://aurbtao.com",
        "https://www.aurbtao.com",
        "https://myself-44f0.onrender.com",
      ],
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use("/api/users", users);
  app.use("/api/personas", personas);
  app.use(error);
};
