const express = require("express");
const router = express.Router();
const { myData } = require("../data");

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post("/answer", async (req, res) => {
  const question = req.body.question;
  const dataToProcess = `Assume yourself to be Gaurav whose details are: ${myData}, and respond to this in a friendly manner: ${question} and keep the conversation interesting and keep the reply short and complete.`;
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

module.exports = router;
