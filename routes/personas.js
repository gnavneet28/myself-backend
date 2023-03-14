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

module.exports = router;
