const axios = require("axios");
const { delay } = require("./Methods");

//Configuring ENV
const dotenv = require("dotenv");
dotenv.config();

// Environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) throw Error("OPENAI_API_KEY is empty");

/**
 * @description Create Embedding Using OpenAI
 * @type Funtion
 * @input text - String, retries - Number, delayMs - Number
 * @returns Embeddings - [Number]
 */
module.exports.createEmbedding = async (text, retries = 3, delayMs = 5000) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/embeddings",
      {
        input: text,
        model: "text-embedding-ada-002",
        encoding_format: "float",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
      }
    );

    return response.data.data[0].embedding;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // Rate-limiting error
      const retryAfter = error.response.headers["retry-after"] || 5;
      console.log(`Rate-limited. Retrying after ${retryAfter} seconds.`);
      await delay(retryAfter * 1000);
      return await module.exports.createEmbedding(text, retries, delayMs);
    } else if (error.code === "EAI_AGAIN" || error.code === "ECONNRESET") {
      // Network error
      if (retries > 0) {
        console.log(
          `Network error occurred. Retrying after ${
            delayMs / 1000
          } seconds. Retries left: ${retries}`
        );
        await delay(delayMs);
        return await module.exports.createEmbedding(text, retries - 1, delayMs);
      } else {
        console.error("Max retries reached. Network error:", error);
        throw error;
      }
    } else {
      // Handle other errors
      console.error("An error occurred:", error);
      throw error;
    }
  }
};

/**
 * @description Uses OpenAI Completion API
 * @type Funtion
 * @input prompt - String
 * @returns response - String
 */
module.exports.openai = async (prompt) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        temperature: 1,
        top_p: 1,
        presence_penalty: 1,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // Rate-limiting error
      const retryAfter = error.response.headers["retry-after"] || 5;
      console.log(`Rate-limited. Retrying after ${retryAfter} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return await module.exports.openai(text);
    } else {
      // Handle other errors
      console.error(error);
      return error;
    }
  }
};
