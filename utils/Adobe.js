//NPM
const fs = require("fs");
const path = require("path");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

//Utils
const { splitAndExtractText } = require("./ExtractText");
const {
  detectLanguage,
  emptyFolder,
  updateJobStatus,
  updateJobErrorStatus,
} = require("./Methods");
const { createIndex } = require("./Pinecone");
const { createEmbedding } = require("./OpenAI");

//Supabase
const supabase = require("../config/supabase");

/**
 * @description Proccess Document Using Adobe
 * @type Funtion
 * @input jobId, company_name, documentId, buffer, filename
 * @returns Sucess OR Error
 */
module.exports.processDocumentUsingAdobe = async (
  jobId,
  company_name,
  documentId,
  filename
) => {
  let text = "";
  let pineconeData = [];

  console.log("Entered into Adobe Processing Function");
  try {
    //Temporary path
    const tempPath = path.join(__dirname, "../temp");

    // Update job status
    await updateJobStatus(jobId, "10%");

    // Extract text
    const result = await splitAndExtractText(filename);
    if (!result.status) {
      await updateJobErrorStatus(jobId, result.msg, result.errorCode);
      throw new Error(result.msg);
    }

    await updateJobStatus(jobId, "30%");

    // Reading Temp
    const dirs = fs.readdirSync(tempPath);
    const dirRegex = /^OUTPUT_\d+$/;

    // Extract Text From JSON
    for (const dir of dirs) {
      if (dirRegex.test(dir)) {
        const structuredDataPath = path.join(
          tempPath,
          dir,
          "structuredData.json"
        );

        const data = await fs.promises
          .readFile(structuredDataPath, "utf-8")
          .catch((err) => {
            console.error(`Error reading file: ${err}`);
            return err;
          });

        // Parse the JSON data into a JavaScript object
        let jsonData = JSON.parse(data);

        // Loop over each element in the jsonData
        for (const element of jsonData.elements) {
          // If the element has a Text property, append it to the text variable
          if (element.Text !== undefined) {
            text += element.Text.toString() + "\n";
          }
        }
      }
    }

    // Clear temporary data to reduce memory usage
    jsonData = null;

    await updateJobStatus(jobId, "50%");

    // Divide The Text Into Chucks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1536,
      chunkOverlap: 200,
    });
    let chunks = await splitter.createDocuments([text]);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Create Embedding
        const embedding = await createEmbedding(chunk.pageContent);

        // Storing into Pinecone Array
        pineconeData.push({
          id: `${company_name}-${Date.now()}-text`,
          values: embedding,
          metadata: {
            type: "text",
            company_name: company_name.toString(),
            text: chunk.pageContent.toString(),
          },
        });
      } catch (error) {
        console.log(error);

        return {
          status: false,
          msg: `Error processing chunk ${i + 1}:`,
          error,
        };
      }
    }

    // Clear chunks variable to free memory
    chunks = null;

    await updateJobStatus(jobId, "60%");

    // Get Embedding for Tables
    for (const dir of dirs) {
      if (dirRegex.test(dir)) {
        const tableDirPath = path.join(tempPath, dir, "tables");

        // Check if the table directory exists
        try {
          await fs.promises.access(tableDirPath);
        } catch (error) {
          console.error(`Directory ${tableDirPath} doesn't exist.`);
          continue;
        }

        // Get all files in the table directory
        const tableFiles = await fs.promises.readdir(tableDirPath);

        for (const tableFile of tableFiles) {
          if (tableFile.endsWith(".csv")) {
            // Get the path to the CSV file
            const tableFilePath = path.join(tableDirPath, tableFile);

            // Check if the CSV file exists
            try {
              await fs.promises.access(tableFilePath, fs.constants.R_OK);
            } catch (error) {
              console.error(
                `File ${tableFilePath} doesn't exist or is not readable.`
              );
              continue;
            }

            // Read the contents of the CSV file
            const tableData = await fs.promises.readFile(
              tableFilePath,
              "utf-8"
            );

            // Create embedding
            const embedding = await createEmbedding(tableData);

            // Store the embedding in the pineconeData array
            pineconeData.push({
              id: `${company_name}-${Date.now()}-table`,
              values: embedding,
              metadata: {
                type: "table",
                company_name: company_name.toString(),
                text: tableData.toString(),
              },
            });
          }
        }
      }
    }

    await updateJobStatus(jobId, "80%");

    // Store in Pinecone
    for (let i = 0; i < pineconeData.length; i += 20) {
      const chunk = pineconeData.slice(i, i + 20);
      try {
        await createIndex(chunk);
      } catch (error) {
        await updateJobErrorStatus(jobId, error, "");
        throw new Error(result.msg);
      }
    }

    // Clear pineconeData variable to free memory
    pineconeData = null;

    await updateJobStatus(jobId, "90%");

    // Store Language Code In Supabase
    const { error } = await supabase
      .from("reports")
      .update({
        language_code: detectLanguage(text.substring(0, 1000)),
      })
      .eq("id", documentId);
    if (error) throw new Error(`Error from supabase ${error.message}`);

    // Empty Temp Folder
    emptyFolder(tempPath);

    // Update final percentage
    await supabase
      .from("logs")
      .update({
        status: true,
        msg: "Document uploaded successfully",
        jobId: jobId,
        id: documentId,
        jobProcessed: "100%",
      })
      .eq("jobId", jobId);

    console.log(`Document processing completed for ${filename}`);
    return {
      status: true,
      id: documentId,
      msg: "Document uploaded successfully",
    };
  } catch (error) {
    console.error(
      `Error processing document ${filename} for ${company_name}:`,
      error
    );
    await updateJobErrorStatus(
      jobId,
      `Error processing document ${filename} for ${company_name}: ${error.message}`
    );
    throw error;
  }
};
