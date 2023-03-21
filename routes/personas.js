const express = require("express");
const router = express.Router();
const { Configuration, OpenAIApi } = require("openai");
const {
  validateNewPersona,
  Persona,
  validateNewLink,
  validateLinkRemove,
} = require("../models/persona");
const { default: mongoose } = require("mongoose");
const { User } = require("../models/user");
const { auth, isVerified } = require("../middleware/auth");
const validator = require("../middleware/validator");
const validateObjectId = require("../middleware/validateObjectId");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post("/answer/:id", [auth, validateObjectId], async (req, res) => {
  const { question } = req.body.question;

  let avatarRequested = await Persona.findOne({ _id: req.params.id }).select(
    "character"
  );
  if (!avatarRequested) {
    return res.status(404).send({
      message:
        "This avatar is no longer available to interact with! This might have been deleted by its creator.",
    });
  }
  let characterOfCurrentUser = `${req.user.name} is a wonderful person to talk`;

  if (req.user.personalAvatar) {
    let currentUserAvatarCharacter = await Persona.findOne({
      _id: req.user.personalAvatar,
    }).select("+character");
    characterOfCurrentUser = currentUserAvatarCharacter.character;
  }

  let character = avatarRequested.character;

  const dataToProcess = `Imagine yourself as a fictional character who is described as: ${character}. Now you know this fictional character very well, who has all the knowledge in the world and can answer any questions asked. Now there is another person named ${req.user.name} who is described as: ${characterOfCurrentUser}, if asks anything to you, you have to reply as if you are that fictional character. You know ${req.user.name} also very well. Now give a valid and most accurate response to this question: ${question}? asked by ${req.user.name}. Remember to not mix the descriptions of ${avatarRequested.name} and ${req.user.name} when replying to ${req.user.name}`;
  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: dataToProcess,
      max_tokens: 2048,
    });
    let responseText = completion.data.choices[0].text;
    setTimeout(async () => {
      await Persona.findOneAndUpdate(
        { _id: req.params.id },
        {
          $addToSet: {
            questionsAsked: question,
            questionsAskedBy: req.user._id,
          },
          $inc: { questionsAskedCount: 1 },
        }
      );
    }, 5000);
    res.send(responseText);
  } catch (error) {
    // console.log(error.response.statusText);
    res.status(500).send({
      message:
        "Sorry! I got busy somewhere. Can you ask again what you asked...",
    });
  }
});

// create new avatar
router.post(
  "/new",
  [auth, isVerified, validator(validateNewPersona)],
  async (req, res) => {
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
        message:
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

    const prompt = `Create a character named ${newAvatar.name},
     a ${newAvatar.gender} with the following personality traits:
      ${newAvatar.personalityTraits.join(", ")}. 
      ${newAvatar.name} is particularly good at 
      ${newAvatar.goodAt} and has set the following 
      goals for themselves: ${newAvatar.goals}. 
      ${newAvatar.name}'s backstory is as follows: 
      ${newAvatar.story} They have the following physical 
      characteristics: ${newAvatar.physicalCharacteristics}. 
      Currently, ${newAvatar.name} is ${newAvatar.currentActivity}.
       In their free time, ${newAvatar.name} likes to ${newAvatar.likes}
        but dislikes ${
          newAvatar.dislikes
        }. Using OpenAI's language model, generate a detailed description of 
        ${
          newAvatar.name
        }, including their appearance, personality, backstory, and current situation. The output should 
        be highly creative and engaging, providing insights into the character's motivations, desires, and fears, as well as their unique
         strengths and weaknesses.`;

    let responseText = "";

    try {
      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 2048,
      });
      responseText = completion.data.choices[0].text;
    } catch (error) {
      //console.log(error.response.statusText);
      res.status(500).send({
        message:
          "Something failed while creating your avatar! Please try again.",
      });
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        newAvatar.character = responseText;
        let avatar = await newAvatar.save({ session });
        let user = await User.findOneAndUpdate(
          { _id: req.user._id },
          { $set: { personalAvatar: newAvatar._id } },
          { session, new: true }
        );

        if (!user.personalAvatar)
          throw new Error(
            "Something failed while updating the avatar. Please try again."
          );

        res.send({ avatar, user });
      });
    } catch (error) {
      // console.log(error);
      res.status(500).send({ message: "Something failed! Please try again." });
    } finally {
      session.endSession();
    }
  }
);

// delete avatar
router.delete("/my/personal/avatar", [auth, isVerified], async (req, res) => {
  await Persona.findOneAndDelete({ _id: req.user.personalAvatar });
  let user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: { personalAvatar: null } },
    { new: true }
  );
  res.send(user);
});

// update avatar
router.put(
  "/update/my/personal/avatar",
  [auth, isVerified, validator(validateNewPersona)],
  async (req, res) => {
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

    if (!req.user.personalAvatar)
      return res.status(400).send({
        message:
          "You have not any avatar created for you. Please create one to update.",
      });

    let personaWithGivenName = await Persona.findOne({
      nameLowerCase: name.toLowerCase(),
    });
    if (
      personaWithGivenName &&
      personaWithGivenName.createdBy.toHexString() !==
        req.user._id.toHexString()
    )
      return res.status(400).send({
        message:
          "Avatar with the given name already exists. Please try another name.",
      });

    let updatedAvatar = await Persona.findOneAndUpdate(
      { _id: req.user.personalAvatar },
      {
        $set: {
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
          lastUpdatedOn: Date.now(),
        },
      },
      { new: true }
    );

    const prompt = `Create a character named ${updatedAvatar.name},
    a ${updatedAvatar.gender} with the following personality traits:
     ${updatedAvatar.personalityTraits.join(", ")}. 
     ${updatedAvatar.name} is particularly good at 
     ${updatedAvatar.goodAt} and has set the following 
     goals for themselves: ${updatedAvatar.goals}. 
     ${updatedAvatar.name}'s backstory is as follows: 
     ${updatedAvatar.story} They have the following physical 
     characteristics: ${updatedAvatar.physicalCharacteristics}. 
     Currently, ${updatedAvatar.name} is ${updatedAvatar.currentActivity}.
      In their free time, ${updatedAvatar.name} likes to ${updatedAvatar.likes}
       but dislikes ${
         updatedAvatar.dislikes
       }. Using OpenAI's language model, generate a detailed description of 
       ${
         updatedAvatar.name
       }, including their appearance, personality, backstory, and current situation. The output should 
       be highly creative and engaging, providing insights into the character's motivations, desires, and fears, as well as their unique
        strengths and weaknesses.`;

    let responseText = "";

    try {
      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 2048,
      });
      responseText = completion.data.choices[0].text;
    } catch (error) {
      //console.log(error.response.statusText);
      res.status(500).send({
        message:
          "Something failed while updating your avatar! Please try again.",
      });
    }

    await Persona.findOneAndUpdate(
      { _id: updatedAvatar._id },
      { $set: { character: responseText } }
    );
    res.send(updatedAvatar);
  }
);

// get avatar
router.get("/avatar/:id", [validateObjectId], async (req, res) => {
  let avatar = await Persona.findOne({ _id: req.params.id }).select(
    "_id name typingText picture links"
  );
  if (!avatar) return res.status(404).send({ message: "Avatar not found!" });
  res.send(avatar);
});

// add links
router.put(
  "/add/link",
  [auth, isVerified, validator(validateNewLink)],
  async (req, res) => {
    let linkToAdd = {
      ...req.body,
      createdBy: req.user._id,
      _id: new mongoose.Types.ObjectId(),
    };
    if (!req.user.personalAvatar) {
      return res.status(400).send({
        message:
          "You have not created your avatar yet! Please create one to start add links.",
      });
    }
    let updatedAvatar = await Persona.findOneAndUpdate(
      { _id: req.user.personalAvatar },
      { $addToSet: { links: linkToAdd } },
      { new: true }
    );
    res.send(updatedAvatar);
  }
);

// remove link from avatar
router.put(
  "/remove/link",
  [auth, isVerified, validator(validateLinkRemove)],
  async (req, res) => {
    let updatedAvatar = await Persona.findOneAndUpdate(
      { _id: req.user.personalAvatar },
      { $pull: { links: { link: req.body.link } } },
      { new: true }
    );
    if (!updatedAvatar)
      return res
        .status(404)
        .send({ message: "Requested avatar to update was not found!" });

    res.send(updatedAvatar);
  }
);

module.exports = router;
