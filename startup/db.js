const winston = require("winston");
const mongoose = require("mongoose");

module.exports = () => {
  const db =
    process.env.NODE_ENV === "development"
      ? process.env.TEMP_DB
      : process.env.DB;

  mongoose
    .connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(async () => {
      winston.info(`Connected to ${db}`);
    });
};
