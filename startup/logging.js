require("express-async-errors");
const winston = require("winston");

module.exports = () => {
  process.on("unhandledRejection", (ex) => {
    throw ex;
  });

  winston.add(
    new winston.transports.File({ filename: "logfile.log", level: "info" })
  );
  winston.add(
    new winston.transports.File({ filename: "asyncErrors.log", level: "error" })
  );

  winston.exceptions.handle(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.prettyPrint(),
        winston.format.colorize()
      ),
    }),

    new winston.transports.File({ filename: "unCaughtExceptions.log" })
  );

  winston.add(
    new winston.transports.Console(
      winston.format.combine(
        winston.format.prettyPrint(),
        winston.format.colorize()
      )
    )
  );
};
