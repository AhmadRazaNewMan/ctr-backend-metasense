const { Pinecone } = require("@pinecone-database/pinecone");

//Configuring ENV
const dotenv = require("dotenv");
dotenv.config();

// Environment variables
const pineconeApiKey = process.env.PINECONE_API_KEY;
if (!pineconeApiKey) throw Error("PINECONE_API_KEY is empty");

//Configure Pinecone
const pc = new Pinecone({
  apiKey: pineconeApiKey,
});

/**
 * @description Create Index Using Pinecone
 * @type Funtion
 * @input embeddings - [Number],
 * @returns
 */
module.exports.createIndex = async (embeddings) => {
  const index = pc.index("cti");
  try {
    await index.upsert(embeddings);
  } catch (error) {
    console.log(error);
    return error;
  }
};

/**
 * @description Query Index Using Pinecone
 * @type Funtion
 * @input embeddings - [Number], company_name - String
 * @returns result - [String]
 */
module.exports.queryIndex = async (embeddings, company_name) => {
  const index = pc.index("cti");
  try {
    const result = await index.query({
      topK: 5,
      vector: embeddings,
      includeValues: true,
      includeMetadata: true,
      filter: { company_name: { $eq: company_name } },
    });

    return result;
  } catch (error) {
    console.log(error);
    return error;
  }
};
