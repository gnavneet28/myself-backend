const express = require("express");
const router = express.Router();
const dayjs = require("dayjs");
const crypto = require("crypto");
const {
  validateRegistration,
  User,
  validateLogin,
  validatePasswordUpdate,
  validateEmailUpdate,
  validateVerificationCode,
  validateSearchUserQuery,
} = require("../models/user");
const sendToken = require("../utility/jwtToken");
const { auth } = require("../middleware/auth");
const validator = require("../middleware/validator");
const bcrypt = require("bcryptjs");
var cloudinary = require("../cloudinary");
const upload = require("../multer");
const fs = require("fs");
const {
  sendNewPasswordResetUrl,
  sendNewEmailConfirmToken,
} = require("../utility/sendEmail");
const jwtDecode = require("jwt-decode");
const { Persona } = require("../models/persona");

// login/signup with mail
router.post("/new/gmail/login", async (req, res) => {
  let ca = jwtDecode(req.body.token);

  let { email, email_verified, exp, family_name, given_name, iat, picture } =
    ca;

  if (!email || !given_name) {
    return res
      .status(400)
      .send({ message: "Email or name of the account was not found!" });
  }
  let user = await User.findOne({ email: email, oAuthLogged: true }).populate(
    "personalAvatar"
  );
  if (user) {
    return sendToken(user, 200, res);
  } else {
    let userWithMail = await User.findOne({
      email: email,
    });
    if (userWithMail) {
      return res.status(400).send({
        message:
          "Please use a password to log into this account. If you have forgotten your password, please request to reset it.",
      });
    }

    let firstName = given_name ? given_name : "";
    let lastName = family_name ? family_name : "";

    let newUser = new User({
      name: firstName + " " + lastName,
      email,
      avatar_url: picture ? picture : "",
      oAuthLogged: true,
      verified: {
        email: email_verified === true ? true : false,
      },
    });

    newUser = await newUser.save();
    sendToken(newUser, 200, res);
  }
});

//register new user
router.post("/register", validator(validateRegistration), async (req, res) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ email: email });
  if (user)
    return res.status(400).send({
      message:
        "This email address is already in use. Please try with other credentials or if this email belongs to you then please reset your password.",
    });

  let modifiedPassword = await bcrypt.hash(password, 10);

  let newUser = new User({
    name,
    email,
    password: modifiedPassword,
    oAuthLogged: false,
  });
  newUser = await newUser.save();
  sendToken(newUser, 200, res);
});

// Login Users { Tested }
router.post("/login", validator(validateLogin), async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, oAuthLogged: false }).select(
    "+password"
  );

  if (!user)
    return res.status(401).send({ message: "Invalid email or password" });

  let isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched)
    return res.status(401).send({ message: "Invalid email or password" });

  sendToken(user, 200, res);
});

// get current user
router.get("/me", [auth], async (req, res) => {
  if (req.user.personalAvatar) {
    let user = await User.findOne({ _id: req.user._id }).populate(
      "personalAvatar"
    );
    return res.send(user);
  }
  res.send(req.user);
});

// search users
router.get(
  "/search",
  [auth, validator(validateSearchUserQuery)],
  async (req, res) => {
    let users = await User.find({
      name: {
        $regex: req.query.keyword.trim(),
        $options: "i",
      },
    })
      .limit(100)
      .select("_id name avatar_url personalAvatar");

    res.send(users);
  }
);

// Logout Users { Tested }
router.get("/logout", async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // must be 'none' to enable cross-site delivery
    secure: process.env.NODE_ENV === "production", // must be true if sameSite='none'
  });

  res.status(200).send();
});

// update user avatar
router.put(
  "/update/avatar",
  [auth, upload.single("avatar")],
  async (req, res) => {
    const uploader = (path) => {
      return cloudinary.upload(path, process.env.USER_AVATARS);
    };

    let file = req.file;
    let personalAvatar = null;

    if (!file) {
      let avatar = null;
      if (req.user.personalAvatar) {
        personalAvatar = await Persona.findOneAndUpdate(
          { _id: req.user.personalAvatar },
          { $set: { picture: "" } },
          { new: true }
        );
      }
      let user = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: { avatar_url: avatar } },
        { new: true, runValidators: true }
      );
      return res.send({ user, avatar: personalAvatar });
    }

    const { path } = file;
    let newPath = {
      public_id: null,
      url: null,
    };

    try {
      newPath = await uploader(path);
      fs.unlinkSync(path);
    } catch (error) {
      return res.status(500).send({
        message:
          "Something went wrong while uploading the image. Please try again later.",
      });
    }

    if (req.user.personalAvatar) {
      personalAvatar = await Persona.findOneAndUpdate(
        { _id: req.user.personalAvatar },
        { $set: { picture: newPath.url } },
        { new: true }
      );
    }

    let user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $set: { avatar_url: newPath.url } },
      { new: true, runValidators: true }
    );
    res.send({ user, avatar: personalAvatar });
  }
);

// Update Password { Tested }
router.put(
  "/update/password",
  [auth, validator(validatePasswordUpdate)],
  async (req, res) => {
    if (req.user.oAuthLogged)
      return res.status(400).send({ message: "Invalid Request!" });

    const { oldPassword, newPassword, confirmPassword } = req.body;
    let user = await User.findOne({ _id: req.user._id }).select("+password");

    const isPasswordMatched = await user.comparePassword(oldPassword);

    if (!isPasswordMatched)
      return res.status(401).send({ message: "Old password is incorrect" });

    if (newPassword.trim() !== confirmPassword.trim())
      return res.status(400).send({ message: "Passwords do not match" });

    let newModifiedPassword = await bcrypt.hash(newPassword.trim(), 10);

    user = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { password: newModifiedPassword } },
      { new: true }
    );

    sendToken(user, 200, res);
  }
);

// get password reset token { Tested }
router.post(
  "/password/forgot",
  [validator(validateEmailUpdate)],
  async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res
        .status(404)
        .send({ message: "There is no account associated with this email." });
    }

    if (user.oAuthLogged)
      return res.status(403).send({
        message:
          "Invalid request! This account was created using login with google.",
      });

    // Get ResetPassword Token
    // const resetToken = user.getResetPasswordToken();

    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hashing and adding resetPasswordToken to userSchema
    let resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    let resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await User.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          resetPasswordToken: resetPasswordToken,
          resetPasswordExpire: resetPasswordExpire,
        },
      }
    );

    let url =
      process.env.NODE_ENV === "development"
        ? process.env.FRONTEND_URL_TEST
        : process.env.FRONTEND_URL_LIVE;

    const resetPasswordUrl = `${url}/password/reset/${resetToken}`;
    try {
      await sendNewPasswordResetUrl(
        [{ email: req.body.email }],
        resetPasswordUrl
      );
      res.send();
    } catch (error) {
      await User.findOneAndUpdate(
        { _id: user._id },
        {
          $set: { resetPasswordToken: null, resetPasswordExpire: null },
        }
      );
      res.status(500).send({
        message:
          "Something failed while sending password reset email! Please try again.",
      });
    }
  }
);

// Update the new password with password reset token { Tested }
router.put("/password/reset/:token", async (req, res) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  let user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send({
      message: "Reset password token has expired. Please request a new one.",
    });
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return res.status(400).send({ message: "Passwords do not match" });
  }

  let modifiedPassword = await bcrypt.hash(req.body.newPassword, 10);

  user = await User.findOneAndUpdate(
    { _id: user._id },
    {
      $set: {
        password: modifiedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    },
    { new: true }
  );

  sendToken(user, 200, res);
});

// Send email confrimation code ; { Tested }
router.post("/email/getCode", [auth], async (req, res) => {
  let user = req.user;
  if (user.verified.email)
    return res.status(400).send({ message: "Your email is already verified" });

  let userWithThisEmailVerified = await User.findOne({
    email: user.email,
  }).select("+lastEmailVerificationSent");

  if (userWithThisEmailVerified.verified.email)
    return res
      .status(401)
      .send({ message: "Account with this email address already exists" });

  if (userWithThisEmailVerified.lastEmailVerificationSent) {
    let lastVerificationTime = dayjs(
      userWithThisEmailVerified.lastEmailVerificationSent
    );
    if (dayjs(Date.now()).diff(dayjs(lastVerificationTime), "seconds") < 60) {
      return res
        .status(500)
        .send({ message: "You can request for code once in a minute." });
    }
  }

  const characters = "123456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }

  let emails = [{ email: user.email }];
  try {
    sendNewEmailConfirmToken(emails, token);
    await User.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          confirmationToken: token,
          confirmationTokenExpiry: Date.now(),
          lastEmailVerificationSent: Date.now(),
        },
      }
    );
    res.send();
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something failed. Please try again!" });
  }
});

// Verify email confirmation code { Tested }
router.post(
  "/email/verifyCode",
  [auth, validator(validateVerificationCode)],
  async (req, res) => {
    let user = await User.findOne({ _id: req.user._id }).select(
      "+confirmationToken +confirmationTokenExpiry"
    );

    let { verificationCode } = req.body;

    let currentTime = dayjs(Date.now());
    let tokenExpiryTime = dayjs(new Date(user.confirmationTokenExpiry));

    let difference = currentTime.diff(tokenExpiryTime, "seconds");

    if (difference >= 120)
      return res
        .status(401)
        .send({ message: "Verification code expired.Please try again!" });

    user = await User.findOneAndUpdate(
      { _id: user._id, confirmationToken: verificationCode },
      { $set: { confirmationToken: null, "verified.email": true } },
      { new: true }
    );
    if (!user)
      return res.status(400).send({
        message:
          "Verification Code did not match! Please check your confirmation code and try again",
      });
    res.send(user);
  }
);

module.exports = router;
