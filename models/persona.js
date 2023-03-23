const mongoose = require("mongoose");
const { PersonalityTraits } = require("../data");
const Joi = require("joi");
const { regex } = require("../utility/regex");

const personaSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: {
      values: ["Personal", "Professional"],
    },
    default: "Personal",
  },
  name: {
    type: String,
    unique: true,
    maxLength: 50,
    minLength: 3,
    required: true,
    trim: true,
  },
  picture: {
    type: String,
    default: "",
  },
  nameLowerCase: {
    type: String,
    unique: true,
    maxLength: 50,
    minLength: 3,
    required: true,
    trim: true,
  },
  goodAt: {
    type: String,
    maxLength: 100,
    trim: true,
    default: "",
  },
  personalityTraits: {
    type: Array,
    required: true,
  },
  languages: {
    type: Array,
    required: true,
    default: ["English", "Hindi"],
  },
  story: {
    type: String,
    maxLength: 600,
    default: "",
  },
  goals: {
    type: String,
    maxLength: 100,
    default: "",
  },
  physicalCharacteristics: {
    type: String,
    maxLength: 100,
    default: "",
  },
  currentActivity: {
    type: String,
    maxLength: 100,
    default: "",
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  authorizedPeople: {
    type: Array,
    default: [],
  },
  questionsAsked: {
    type: Array,
    select: false,
    default: [],
  },
  questionsAskedBy: {
    type: Array,
    select: false,
    default: [],
  },
  questionsAskedCount: {
    type: Number,
    default: 0,
  },
  lastUpdatedOn: {
    type: Date,
    default: Date.now,
  },
  typingText: {
    type: String,
    default: "Typing...",
    maxLength: 50,
    trim: true,
  },
  likes: {
    type: String,
    maxLength: 80,
    default: "",
  },
  dislikes: {
    type: String,
    maxLength: 80,
    default: "",
  },
  gender: {
    type: String,
    enum: {
      values: ["Male", "Female", "Prefer not to say"],
      message: "Please select a valid gender.",
    },
    required: true,
  },
  links: {
    type: Array,
    default: [],
  },
  character: {
    type: String,
    default: "",
    select: false,
  },
});

const Persona = mongoose.model("Persona", personaSchema);

const validateNewPersona = (req) => {
  const schema = Joi.object({
    name: Joi.string().required().label("Your avatar name").max(50).min(3),
    personalityTraits: Joi.array()
      .min(1)
      .label("Personality Traits")
      .required(),
    languages: Joi.array().min(1).label("Languages you know").required(),
    goodAt: Joi.string().max(100).required().label("You are good at"),
    story: Joi.string().required().label("Your story").max(300),
    goals: Joi.string().required().max(100).label("Your goal"),
    gender: Joi.string()
      .valid("Male", "Female", "Prefer not to say")
      .required()
      .label("Gender of your avatar"),
    physicalCharacteristics: Joi.string()
      .required()
      .max(100)
      .label("Your avatar physical characterstics"),
    currentActivity: Joi.string()
      .required()
      .max(100)
      .label("Your current activity"),
    likes: Joi.string().required().max(80).label("Likes"),
    dislikes: Joi.string().required().max(80).label("Dislikes"),
  });

  return schema.validate(req.body);
};
const validateCurrentActivityUpdate = (req) => {
  const schema = Joi.object({
    currentActivity: Joi.string()
      .allow("")
      .max(80)
      .label("Your current activity"),
  });

  return schema.validate(req.body);
};

const validateNewLink = (req) => {
  const schema = Joi.object({
    title: Joi.string().max(60).required().label("Link title"),
    link: Joi.string()
      .max(300)
      .regex(regex.storeLinks)
      .label("Link")
      .required(),
  });

  return schema.validate(req.body);
};
const validateLinkRemove = (req) => {
  const schema = Joi.object({
    link: Joi.string()
      .max(300)
      .regex(regex.storeLinks)
      .label("Link")
      .required(),
  });

  return schema.validate(req.body);
};

const validateQuestion = (req) => {
  const schema = Joi.object({
    question: Joi.string().required().max(100).label("Question"),
    lastConversation: Joi.object({
      asked: Joi.string().max(200).label("Last question asked").allow(""),
      replied: Joi.string().max(1000).allow("").label("Last question replied"),
    }),
    recentQuestionsAsked: Joi.array().allow("").label("Recent questions asked"),
  });

  return schema.validate(req.body);
};

module.exports.Persona = Persona;
module.exports.validateNewPersona = validateNewPersona;
module.exports.validateNewLink = validateNewLink;
module.exports.validateLinkRemove = validateLinkRemove;
module.exports.validateCurrentActivityUpdate = validateCurrentActivityUpdate;
module.exports.validateQuestion = validateQuestion;
