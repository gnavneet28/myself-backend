const winston = require("winston");

module.exports = (err, req, res, next) => {
  winston.error(err.message, err);
  // res.status(500).send({ message: "Something failed", error: err.message });
  res.status(500).send({ message: "Something failed!" });
};
