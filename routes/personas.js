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
  const dataToProcess = `Based on the given data: ${myData}, respond to this: ${question}`;
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: dataToProcess,
    max_tokens: 2000,
  });
  let responseText = completion.data.choices[0].text;
  res.send(responseText);
});

module.exports = router;
