const { UnstructuredClient } = require("unstructured-client");
const fs = require("fs");
const path = require("path");

//Configure ENV
const dotenv = require("dotenv");
dotenv.config();

const unstructuredApiKey = process.env.UNSTRUCTURED_API_KEY;
if (!unstructuredApiKey) throw Error("UNSTRUCTURED_API_KEY is empty");

module.exports.unstructuredExtract = async (filename) => {
  const client = new UnstructuredClient({
    serverURL: "https://api.unstructuredapp.io/",
    security: {
      apiKeyAuth: unstructuredApiKey,
    },
  });

  // Prepare Path
  const tempPath = path.join(__dirname, "../temp");
  const filePath = path.join(tempPath, filename);

  const data = fs.readFileSync(filePath);

  //UnStructured
  try {
    const response = await client.general.partition({
      files: {
        content: data,
        fileName: filename,
      },
    });
    if (response.statusCode === 200) {
      return { status: true, response: response.elements };
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
