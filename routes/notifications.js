const express = require("express");
const router = express.Router();
const {
  Notification,
  validateReplyLikedNotification,
} = require("../models/notification");
const { auth, isVerified } = require("../middleware/auth");
const validator = require("../middleware/validator");
const validateObjectId = require("../middleware/validateObjectId");
const { Persona } = require("../models/persona");

router.post(
  "/like/:id",
  [
    auth,
    isVerified,
    validateObjectId,
    validator(validateReplyLikedNotification),
  ],
  async (req, res) => {
    let avatar = await Persona.findOne({ _id: req.params.id });
    if (!avatar)
      return res
        .status(404)
        .send({ message: "Sorry! The avatar was not found." });

    const { question, reply } = req.body;

    let newNotification = new Notification({
      createdBy: req.user._id,
      createdFor: avatar.createdBy,
      message: "Your reply was liked!",
      notification: {
        question,
        reply,
      },
      category: "ReplyLiked",
    });

    await newNotification.save();

    res.send();
  }
);

router.get("/my/all", [auth, isVerified], async (req, res) => {
  let allNotifications = await Notification.find({ createdFor: req.user._id });
  res.send(allNotifications);
});

router.delete(
  "/:id",
  [auth, isVerified, validateObjectId],
  async (req, res) => {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      createdFor: req.user._id,
    });
  }
);

router.put("/update/seen", [auth, isVerified], async (req, res) => {
  let notifications = await Notification.updateMany(
    { createdFor: req.user._id },
    { $set: { seen: true } },
    { new: true }
  );

  res.send(notifications);
});

module.exports = router;
