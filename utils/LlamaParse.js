const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const data = new FormData();

//Configure ENV
const dotenv = require("dotenv");
dotenv.config();

const llamaApiKey = process.env.LLAMA_INDEX_API_KEY;
if (!llamaApiKey) throw Error("LLAMA_INDEX_API_KEY is empty");

module.exports.parsingJob = async (filename) => {
  // Prepare temporary path
  const tempPath = path.join(__dirname, "../temp");
  const filePath = path.join(tempPath, filename);
  console.log("Enter", filePath);

  data.append("file", fs.createReadStream(filePath));

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.cloud.llamaindex.ai/api/parsing/upload",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${llamaApiKey}`,
      ...data.getHeaders(),
    },
    data: data,
  };

  try {
    const response = await axios.request(config);
    return { status: true, response };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports.checkStatus = async (parsingJobId) => {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api.cloud.llamaindex.ai/api/parsing/job/${parsingJobId}`,
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${llamaApiKey}`,
    },
  };

  try {
    const response = await axios.request(config);
    return { status: true, response };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports.extractText = async (parsingJobId) => {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api.cloud.llamaindex.ai/api/parsing/job/${parsingJobId}/result/markdown`,
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${llamaApiKey}`,
    },
  };

  try {
    const response = await axios.request(config);
    return { status: true, response };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
