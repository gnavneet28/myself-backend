const mongoose = require("mongoose");
const Joi = require("joi");

const notificationSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: {
      values: ["ReplyLiked"],
      message: "Please select a valid category of notification.",
    },
    default: "ReplyLiked",
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
    select: false,
  },
  createdFor: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  notification: {
    type: Object,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});

const Notification = mongoose.model("Notification", notificationSchema);

const validateReplyLikedNotification = (req) => {
  const schema = Joi.object({
    question: Joi.string().required().max(100).label("Liked question"),
    reply: Joi.string().required().max(1000).label("Liked reply"),
  });

  return schema.validate(req.body);
};

module.exports.Notification = Notification;
module.exports.validateReplyLikedNotification = validateReplyLikedNotification;
