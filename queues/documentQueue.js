//NPM
const Queue = require("bull");

//Utils
const { processDocumentUsingAdobe } = require("../utils/Adobe");
const { processDocumentUsingUnstructured } = require("../utils/UnStructured");
const { processDocumentUsingLlama } = require("../utils/LLama");

//Supabase
const supabase = require("../config/supabase");

//Redis
const { connectRedis } = require("../config/redis");
let cacheConnection;

//Connect to Redis
async function redisConnect() {
  try {
    cacheConnection = await connectRedis();
  } catch (error) {
    console.error("Failed to connect to redis", error);
  }
}

// Immediately invoking the redisConnet function
(async () => {
  await redisConnect();
})();

//Credentials
const cacheHostName = process.env.CACHE_FOR_REDIS_HOST_NAME;
const cachePassword = process.env.CACHE_FOR_REDIS_ACCESS_KEY;

if (!cacheHostName) throw Error("CACHE_FOR_REDIS_HOST_NAME is empty");
if (!cachePassword) throw Error("CACHE_FOR_REDIS_ACCESS_KEY is empty");

// Create Bull queue and use Redis client
const documentQueue = new Queue("document processing", {
  redis: {
    host: cacheHostName,
    port: 11065,
    password: cachePassword,
  },
});

documentQueue.on("error", async (err) => {
  console.error("Bull queue error:", err);
});

documentQueue.on("stalled", async (job) => {
  console.warn("Job stalled:", job.id);

  // Update final percentage
  await supabase
    .from("logs")
    .update({
      status: "MISSING",
      msg: `Job Stalled`,
      jobId: job.id,
    })
    .eq("jobId", job.id);

  //Update Report Status
  await supabase
    .from("reports")
    .update({ status: "MISSING" })
    .eq("id", [job.id].documentId);
});

documentQueue.on("failed", async (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);

  // Update final percentage
  await supabase
    .from("logs")
    .update({
      status: "ERROR",
      msg: `Job ${job.id} failed with error: ${err.message}`,
      jobId: job.id,
    })
    .eq("jobId", job.id);

  //Update Report Status
  await supabase
    .from("reports")
    .update({ status: "ERROR" })
    .eq("id", [job.id].documentId);

  // Flush the Redis cache using sendCommand method for `FLUSHALL`
  try {
    await cacheConnection.sendCommand(["FLUSHALL"]);
    console.log("Redis cache successfully flushed.");
  } catch (err) {
    console.error("Failed to flush Redis cache:", err);
  }

  try {
    await cacheConnection.set("RESTART_SERVER", "true");
    console.log(`Setting RESTART_SERVER to true in Redis`);
  } catch (error) {
    console.error("Failed to set RESTART_SERVER in Redis:", error);
  }
});

documentQueue.on("completed", async (job, result) => {
  // Update final percentage
  const { error } = await supabase
    .from("logs")
    .update({
      status: "COMPLETE",
      msg: "Document uploaded successfully",
      jobId: job.id,
      documentId: [job.id].documentId,
      jobProcessed: "100%",
    })
    .eq("jobId", job.id);
  if (error) return { msg: `Error from supabase ${error.message}` };

  //Update Report Status
  await supabase
    .from("reports")
    .update({ status: "COMPLETE" })
    .eq("id", [job.id].documentId);

  console.log(`Job ${job.id} completed successfully.`);

  // Empty the Bull queue after ensuring job completion
  await documentQueue
    .getJobCounts()
    .then(async (counts) => {
      console.log("Job counts:", counts);
      if (
        counts.active === 0 &&
        counts.waiting === 0 &&
        counts.delayed === 0 &&
        counts.failed === 0
      ) {
        await documentQueue.empty();
        console.log(`Bull queue successfully emptied.`);
        // Flush the Redis cache using sendCommand method for `FLUSHALL`
        try {
          await cacheConnection.sendCommand(["FLUSHALL"]);
          console.log("Redis cache successfully flushed.");
        } catch (err) {
          console.error("Failed to flush Redis cache:", err);
        }
      }
    })
    .catch((err) => {
      console.error("Error getting job counts:", err);
    });

  try {
    await cacheConnection.set("RESTART_SERVER", "true");
    console.log(`Setting RESTART_SERVER to true in Redis`);
  } catch (error) {
    console.error("Failed to set RESTART_SERVER in Redis:", error);
  }
});

// Process jobs in queue
documentQueue.process(async (job) => {
  try {
    const { company_name, documentId, filename, type } = job.data;
    if (type === "unstructured") {
      await processDocumentUsingUnstructured(
        job.id,
        company_name,
        documentId,
        filename
      );
    } else if (type === "adobe") {
      await processDocumentUsingAdobe(
        job.id,
        company_name,
        documentId,
        filename
      );
    } else if (type === "llama") {
      await processDocumentUsingLlama(
        job.id,
        company_name,
        documentId,
        filename
      );
    }

    return { status: true, msg: "Document processing completed." };
  } catch (error) {
    console.error(`Failed to process job ${job.id}:`, error);
    throw error;
  }
});

module.exports = documentQueue;
