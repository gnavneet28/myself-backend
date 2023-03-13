const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const createPersona = ({
  background,
  role,
  product,
  gender = "",
  maritalStatus = "",
  familyStatus = "",
  demographics = "",
  ethnicity = "",
  ageLowerLimit = 18,
  ageUpperLimit = 40,
}) => {
  let prompt = `Create a detailed user persona which includes 
    Name, Age, Gender, Education, Profession, Ethnicity, Marital status, 
    Family Status, Location, Language Known, Technology Expertise, Personality Treaits, 
    Habbits, Motivation, Goal and Pain points with following details
    : Background of persona : ${background}, Role of persona : ${role},
    Product or Services used by persona : ${product}, Gender : ${gender},
    Marital Status: ${maritalStatus}, Family Status: ${familyStatus},
    Demographics: ${demographics}, Ehnicity: ${ethnicity}, Age Range of: ${ageLowerLimit} to ${ageUpperLimit}`;

  return openai.createCompletion({
    model: "text-davinci-003",
    prompt,
    max_tokens: 2048,
  });
};

const createPersonaImage = (gender, age, location) => {
  return openai.createImage({
    prompt: `create photograph of ${age} years old ${gender} from ${location}`,
    n: 1,
    size: "1024x1024",
  });
};

module.exports.createPersona = createPersona;
module.exports.createPersonaImage = createPersonaImage;
