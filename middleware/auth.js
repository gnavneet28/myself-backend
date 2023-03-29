const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");
const { User } = require("../models/user");

module.exports.auth = async function auth(req, res, next) {
  const { token } = req.cookies;
  if (!token)
    return res.status(401).send({
      message: "Access denied! Please make sure you have enabled cookies.",
    });

  try {
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    req.user = await User.findOne({ _id: decoded._id });
    next();
  } catch (error) {
    res.status(400).send({ message: "Invalid Token" });
  }
};
module.exports.semiAuth = async function auth(req, res, next) {
  const { token } = req.cookies;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
      req.user = await User.findOne({ _id: decoded._id });
      next();
    } catch (error) {
      res.status(400).send({ message: "Invalid Token" });
    }
  } else {
    let guest = {
      _id: "guest" + "-" + new mongoose.Types.ObjectId(),
      name: "Stranger",
      personalAvatar: null,
    };
    req.user = guest;
    next();
  }
};

module.exports.isAdmin = function (req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).send({
      message: "This action can only be executed with admin account",
    });
  }
  next();
};

module.exports.isVerified = function (req, res, next) {
  if (!req.user.verified.email) {
    return res.status(403).send({
      message: "Please verify your email to proceed.",
    });
  }
  next();
};
