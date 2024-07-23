const path = require("path");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

//Utils
const {
  emptyFolder,
  updateJobStatus,
  updateJobErrorStatus,
  detectLanguage,
} = require("./Methods");
const { unstructuredExtract } = require("./UnStructuredExtract");
const { createEmbedding } = require("./OpenAI");
const { createIndex } = require("./Pinecone");

//Supabase
const supabase = require("../config/supabase");

module.exports.processDocumentUsingUnstructured = async (
  jobId,
  company_name,
  documentId,
  filename
) => {
  //Variables
  let text = "";
  let pineconeData = [];

  console.log("Entered into Unstructured Processing Function");
  try {
    //Temporary path
    const tempPath = path.join(__dirname, "../temp");

    // Update job status
    await updateJobStatus(jobId, "10%");

    //Extract Text
    const result = await unstructuredExtract(filename);
    if (!result.status) {
      await updateJobErrorStatus(jobId, result);
      throw new Error(result);
    }

    await updateJobStatus(jobId, "30%");

    //Gather Text
    result.response.forEach((obj) => {
      if (obj.text) {
        text += obj.text.toString() + "\n";
      }
    });

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
        // await updateJobErrorStatus(jobId, "Error in Creating Embeddings");
        throw new Error(error);
      }
    }

    // Clear chunks variable to free memory
    chunks = null;

    await updateJobStatus(jobId, "50%");

    // Store in Pinecone
    for (let i = 0; i < pineconeData.length; i += 20) {
      const chunk = pineconeData.slice(i, i + 20);
      try {
        await createIndex(chunk);
      } catch (error) {
        console.log(error);
        // await updateJobErrorStatus(jobId, "Error in Pinecone");
        throw new Error(error);
      }
    }

    // Clear pineconeData variable to free memory
    pineconeData = null;

    await updateJobStatus(jobId, "80%");

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
