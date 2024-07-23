const path = require("path");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

//Utils
const {
  delay,
  updateJobStatus,
  updateJobErrorStatus,
  detectLanguage,
  emptyFolder,
} = require("./Methods");
const { parsingJob, checkStatus, extractText } = require("./LlamaParse");
const { createEmbedding } = require("./OpenAI");
const { createIndex } = require("./Pinecone");

//Supabase
const supabase = require("../config/supabase");

module.exports.processDocumentUsingLlama = async (
  jobId,
  company_name,
  documentId,
  filename
) => {
  //Variables
  let pineconeData = [];

  console.log("Entered into Llama Processing Function");
  try {
    //Temporary path
    const tempPath = path.join(__dirname, "../temp");

    // Update job status
    await updateJobStatus(jobId, documentId, "10%");

    //Call Llama Parsing
    const result = await parsingJob(filename);
    if (!result.status) {
      await updateJobErrorStatus(jobId, documentId, result);
      throw new Error(result);
    }

    //Checking Parsing Status
    let status = result.response.data.status;
    while (status === "PENDING") {
      const parsingStatus = await checkStatus(result.response.data.id);
      if (!parsingStatus.status) {
        await updateJobErrorStatus(jobId, documentId, result);
        throw new Error(parsingStatus);
      }
      status = parsingStatus.response.data.status;
      await delay(200000);
    }
    if (status === "PENDING") {
      throw new Error(
        "Please try again, Parsing Job still pending after max tries"
      );
    }

    //Extract Text
    const parsingDone = await extractText(result.response.data.id);
    if (!parsingDone.status) {
      await updateJobErrorStatus(jobId, documentId, result);
      throw new Error(parsingDone);
    }
    const text = parsingDone.response.data.markdown;

    await updateJobStatus(jobId, documentId, "30%");

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
        await updateJobErrorStatus(
          jobId,
          documentId,
          "Error in Creating Embeddings"
        );
        throw new Error(error);
      }
    }

    // Clear chunks variable to free memory
    chunks = null;

    await updateJobStatus(jobId, documentId, "50%");

    // Store in Pinecone
    for (let i = 0; i < pineconeData.length; i += 20) {
      const chunk = pineconeData.slice(i, i + 20);
      try {
        await createIndex(chunk);
      } catch (error) {
        console.log(error);
        await updateJobErrorStatus(jobId, documentId, "Error in Pinecone");
        throw new Error(error);
      }
    }

    // Clear pineconeData variable to free memory
    pineconeData = null;

    await updateJobStatus(jobId, documentId, "80%");

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
        status: "COMPLETE",
        msg: "Document uploaded successfully",
        jobId: jobId,
        id: documentId,
        jobProcessed: "100%",
      })
      .eq("jobId", jobId);

    //Update Report Status
    await supabase
      .from("reports")
      .update({ status: "COMPLETE" })
      .eq("id", documentId);

    console.log(`Document processing completed for ${filename}`);
    return {
      status: "COMPLETE",
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
      documentId,
      `Error processing document ${filename} for ${company_name}: ${error.message}`
    );
    throw error;
  }
};
