const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Joi = require("joi");
const { regex } = require("../utility/regex");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter Your First Name"],
    maxLength: [100, "Name cannot exceed 30 characters"],
    minLength: [1, "Name should have more than 4 characters"],
    trim: true,
  },
  personalAvatar: {
    type: mongoose.Types.ObjectId,
    ref: "Persona",
    default: null,
  },
  email: {
    type: String,
    required: [true, "Please Enter Your Email"],
    validate: [validator.isEmail, "Please Enter a valid Email"],
    trim: true,
    unique: true,
  },
  password: {
    default: null,
    required: function () {
      return this.oAuthLogged === true ? false : true;
    },
    type: String,
    minLength: [8, "Password should be greater than 8 characters"],
    select: false,
  },
  avatar_url: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: {
      values: ["user", "admin"],
      message: "User type is not valid",
    },
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  verified: {
    email: { type: Boolean, default: false },
    phoneNumber: { type: Boolean, default: false },
  },
  oAuthLogged: {
    type: Boolean,
    default: false,
  },
  confirmationToken: { type: String, select: false },
  confirmationTokenExpiry: { type: Date, select: false },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastEmailVerificationSent: {
    type: Date,
    select: false,
    default: null,
  },
  lastPhoneVerificationSent: {
    type: Date,
    select: false,
    default: null,
  },
});

userSchema.methods.getJWTToken = function () {
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.JWT_PRIVATE_KEY,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};

// Compare Password

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generating Password Reset Token
userSchema.methods.getResetPasswordToken = function () {
  // Generating Token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hashing and adding resetPasswordToken to userSchema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

const validateRegistration = (req) => {
  const schema = Joi.object({
    name: Joi.string()
      .max(100)
      .min(3)
      .required()
      .label("First Name")
      .regex(regex.username),
    email: Joi.string().email().required().label("Email").max(150),
    password: Joi.string().max(32).required().label("Password"),
  });

  return schema.validate(req.body);
};

const validateLogin = (req) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label("Email").max(150),
    password: Joi.string().max(32).required().label("Password"),
  });

  return schema.validate(req.body);
};

const validatePasswordUpdate = (req) => {
  const schema = Joi.object({
    newPassword: Joi.string().max(32).required().label("New Password"),
    confirmPassword: Joi.string().max(32).required().label("Confirm Password"),
    oldPassword: Joi.string().max(32).required().label("Old Password"),
  });

  return schema.validate(req.body);
};

const validateVerificationCode = (req) => {
  const schema = Joi.object({
    verificationCode: Joi.string()
      .max(6)
      .min(6)
      .required()
      .label("Verification code"),
  });

  return schema.validate(req.body);
};

const validateEmailUpdate = (req) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label("Email").max(150),
  });

  return schema.validate(req.body);
};

const validateSearchUserQuery = (req) => {
  const schema = Joi.object({
    keyword: Joi.string().required().max(20).label("User name to search"),
  });

  return schema.validate(req.query);
};

const User = mongoose.model("User", userSchema);

module.exports.User = User;
module.exports.validateRegistration = validateRegistration;
module.exports.validateLogin = validateLogin;
module.exports.validatePasswordUpdate = validatePasswordUpdate;
module.exports.validateVerificationCode = validateVerificationCode;
module.exports.validateEmailUpdate = validateEmailUpdate;
module.exports.validateSearchUserQuery = validateSearchUserQuery;
