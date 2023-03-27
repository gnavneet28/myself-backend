const express = require("express");
const router = express.Router();
const { Configuration, OpenAIApi } = require("openai");
const {
  validateNewPersona,
  Persona,
  validateNewLink,
  validateLinkRemove,
  validateQuestion,
  validateMoodUpdate,
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

// reply to question asked
router.post(
  "/answer/:id",
  [auth, validateObjectId, validator(validateQuestion)],
  async (req, res) => {
    const { question, recentQuestionsAsked, lastConversation } = req.body;

    let avatarRequested = await Persona.findOne({ _id: req.params.id }).select(
      "+character +questionsAsked +languages"
    );
    if (!avatarRequested) {
      return res.status(404).send({
        message:
          "This avatar is no longer available to interact with! This might have been deleted by its creator.",
      });
    }

    let moodOfCurrentUser = "Happy";
    let characterOfCurrentUser = `${req.user.name} is a wonderful person to talk`;

    if (req.user.personalAvatar) {
      let currentUserAvatarCharacter = await Persona.findOne({
        _id: req.user.personalAvatar,
      }).select("+character");
      characterOfCurrentUser = currentUserAvatarCharacter.character;
      moodOfCurrentUser = currentUserAvatarCharacter.mood;
    }

    let character = avatarRequested.character;

    const dataToProcess = `Imagine that there is a fictional character who is described as: ${character},
     Now you know this fictional character very well, who has all the knowledge in the world and can answer any questions asked.
     Now if a person named ${
       req.user.name
     } and described as: ${characterOfCurrentUser}, asks anything to you, then you have to frankly answer, without any hesitation and restriction.
      If you do not find enough information on ${
        avatarRequested.name
      } to respond then use your 
     infinite data source to answer and that must be relevant to ${
       avatarRequested.name
     }. When you reply anything asked 
     by ${req.user.name}, it should be authentic and feel like you as ${
      avatarRequested.name
    } is giving replies, and you respond compulsorily in ${
      avatarRequested.name
    }'s unique style of speaking.
     Now that you are: ${
       avatarRequested.name
     }, and have the knowledge that you have been asked these questions: ${recentQuestionsAsked
      .slice(-5)
      .join(", ")} by ${
      req.user.name
    } recently, and the last question you were asked from ${
      req.user.name
    } was:${lastConversation.asked} to which you replied: ${
      lastConversation.replied
    }, keeping in mind that you are now in a extremely ${
      avatarRequested.mood ? avatarRequested.mood : "Happy"
    } mood, and ${
      req.user.name
    } is in an extremely ${moodOfCurrentUser}, and only have to answer this: ${question},
    and in your unique speaking style, give a valid, authentic, and most accurate response to this: ${question}?`;
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
      res.status(500).send({
        message: "Sorry! I am not available now. Can you ask again later...",
      });
    }
  }
);

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
      languages,
    } = req.body;

    if (req.user.personalAvatar)
      return res.status(400).send({
        message:
          "You already have an avatar created for you. Please update your existing one.",
      });

    let personaWithGivenName = await Persona.findOne({
      nameLowerCase: name.trim().toLowerCase(),
    });
    if (personaWithGivenName)
      return res.status(400).send({
        message:
          "Avatar with the given name already exists. Please try another name.",
      });

    let newAvatar = new Persona({
      name,
      nameLowerCase: name.trim().toLowerCase(),
      shareName: name.trim().toLowerCase().replace(/\s+/g, "_"),
      personalityTraits,
      gender,
      goals,
      goodAt,
      story,
      physicalCharacteristics,
      currentActivity,
      likes,
      dislikes,
      languages,
      picture: req.user.avatar_url,
      createdBy: req.user._id,
    });

    const prompt = `Create a character which is has humour, has emotions, can reason, can imagine, 
    communicate according to its personality,and most of the time replies or answer to any
       question asked to it, in the language that the person who is asking, understands and speaks, with unique personality and speaking style, named ${
         newAvatar.name
       },
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
        but dislikes ${newAvatar.dislikes}. ${
      newAvatar.name
    } can speak in following languages: ${languages.join(
      ", "
    )}. Using OpenAI's language model and its high quality character generation power, generate a detailed and precise description of 
        ${
          newAvatar.name
        },including their appearance, way of speaking, personality,nationality, place of living,
        backstory, languages, personality traits,likes, dislikes, gender, current activity, goals and current situation. The output should 
       be highly creative, authentic, and engaging, providing insights into the character's motivations, desires, way of speaking and way of thinking, and fears, as well as their unique
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
      languages,
    } = req.body;

    if (!req.user.personalAvatar)
      return res.status(400).send({
        message:
          "You have not any avatar created for you. Please create one to update.",
      });

    let personaWithGivenName = await Persona.findOne({
      nameLowerCase: name.trim().toLowerCase(),
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
          nameLowerCase: name.trim().toLowerCase(),
          shareName: name.trim().toLowerCase().replace(/\s+/g, "_"),
          personalityTraits,
          gender,
          goals,
          goodAt,
          story,
          physicalCharacteristics,
          currentActivity,
          likes,
          dislikes,
          languages,
          lastUpdatedOn: Date.now(),
        },
      },
      { new: true }
    );

    const prompt = `Create a character which is has humour, has emotions, can reason, can imagine, 
    communicate according to its personality,and most of the time replies or answer to any
       question asked to it, in the language that the person who is asking, understands and speaks, with unique personality and speaking style, named ${
         updatedAvatar.name
       },
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
       but dislikes ${updatedAvatar.dislikes}.${
      updatedAvatar.name
    },speaks in following languages: ${languages.join(
      ", "
    )}. Using OpenAI's language model and its high quality character generation power, generate a detailed and precise description of
       ${
         updatedAvatar.name
       }, including their appearance, way of speaking, personality,nationality, place of living,
        backstory, languages, personality traits,likes, dislikes, gender, current activity, goals and current situation. The output should 
       be highly creative, authentic, and engaging, providing insights into the character's motivations, desires,way of speaking and way of thinking, and fears, as well as their unique
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
router.get("/avatar/:id", async (req, res) => {
  if (req.params.id.length > 100)
    return res.status(400).send({ message: "Invalid request!" });

  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    let avatar = await Persona.findOne({ _id: req.params.id }).select(
      "_id name typingText picture links shareName"
    );
    if (!avatar) return res.status(404).send({ message: "Avatar not found!" });
    return res.send(avatar);
  }
  let avatar = await Persona.findOne({
    shareName: req.params.id.trim().toLowerCase(),
  }).select("_id name typingText picture links shareName");
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
          "You have not created your avatar yet! Please create one to start adding links.",
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

// update mood
router.put(
  "/update/mood",
  [auth, validator(validateMoodUpdate)],
  async (req, res) => {
    if (!req.user.personalAvatar) {
      return res.status(400).send({ message: "Invalid request!" });
    }
    let updatedAvatar = await Persona.findOneAndUpdate(
      { _id: req.user.personalAvatar },
      { $set: { mood: req.body.mood.trim() } },
      { new: true }
    );
    res.send(updatedAvatar);
  }
);

module.exports = router;
