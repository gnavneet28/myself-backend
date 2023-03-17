const express = require("express");
const router = express.Router();
const { myData } = require("../data");
const { Configuration, OpenAIApi } = require("openai");
const {
  validateNewPersona,
  Persona,
  validateCurrentActivityUpdate,
} = require("../models/persona");
const { default: mongoose } = require("mongoose");
const { User } = require("../models/user");
const { auth } = require("../middleware/auth");
const validator = require("../middleware/validator");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post("/answer", async (req, res) => {
  const question = req.body.question;
  const dataToProcess = `You are a fictional character named Gauarv and has the following information on him: ${myData} having a conversation with another character. You know Gaurav very well and can answer any questions about his life and experiences. If you don't know the answer to a question, you can generate related content to help answer it. Now you have to assume yourself to be Gaurav and answer the given question: ${question} in a way that person who is asking the question should get reply from you as Gaurav.`;
  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: dataToProcess,
      max_tokens: 200,
    });
    let responseText = completion.data.choices[0].text;
    res.send(responseText);
  } catch (error) {
    console.log(error.response.statusText);
    res
      .status(500)
      .send({ messgae: "I am tired ab kl puchna jo bhi puchna ho!" });
  }
});

router.post("/new", [auth, validator(validateNewPersona)], async (req, res) => {
  const {
    name,
    personalityTraits,
    gender,
    goals,
    goodAt,
    story,
    physicalCharacteristics,
    currentActivity,
    likes,
    dislikes,
  } = req.body;

  if (req.user.personalAvatar)
    return res.status(400).send({
      message:
        "You already have an avatar created for you. Please update your existing one.",
    });

  let personaWithGivenName = await Persona.findOne({
    nameLowerCase: name.toLowerCase(),
  });
  if (personaWithGivenName)
    return res.status(400).send({
      messgae:
        "Avatar with the given name already exists. Please try another name.",
    });

  let newAvatar = new Persona({
    name,
    nameLowerCase: name.toLowerCase(),
    personalityTraits,
    gender,
    goals,
    goodAt,
    story,
    physicalCharacteristics,
    currentActivity,
    likes,
    dislikes,
    picture: req.user.avatar_url,
    createdBy: req.user._id,
  });

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      let promiseOne = newAvatar.save({ session });
      let promiseTwo = User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: { personalAvatar: newAvatar._id } },
        { session, new: true }
      );
      const [avatar, user] = await Promise.all([promiseOne, promiseTwo]);

      if (!user.personalAvatar)
        throw new Error(
          "Something failed while updating the avatar. Please try again."
        );
      res.send({ avatar, user });
    });
  } catch (error) {
    res.status(500).send({ message: "Something failed! Please try again." });
  } finally {
    session.endSession();
  }
});

router.put(
  "/my/avatar/currentActivity",
  [auth, validator(validateCurrentActivityUpdate)],
  async (req, res) => {
    const { currentActivity } = req.body;

    let avatar = await Persona.findOneAndUpdate(
      { _id: req.user.personalAvatar },
      { $set: { currentActivity } },
      { new: true }
    );
    if (!avatar) {
      return res
        .status(404)
        .send({ message: "Requested avatar to update was not found!" });
    }
    res.send(avatar);
  }
);

router.delete("/my/personal/avatar", [auth], async (req, res) => {
  await Persona.findOneAndDelete({ _id: req.user.personalAvatar });
  let user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: { personalAvatar: null } },
    { new: true }
  );
  res.send(user);
});

module.exports = router;
