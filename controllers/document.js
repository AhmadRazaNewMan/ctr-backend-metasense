const xlsx = require("xlsx");
const path = require("path");

//Utils
const {
  parseResponseJSON,
  prepareTempPath,
  writeFile,
  uploadToSupabase,
} = require("../utils/Methods");
const { createEmbedding, openai } = require("../utils/OpenAI");
const { queryIndex } = require("../utils/Pinecone");
const { CompressPDF } = require("../utils/Compress");

//Final Prompts
const {
  translatePrompt,
  generateFinalPromptForScopesInfo,
  generateFinalPromptForTOTScope1,
  generateFinalPromptForFacilityStationary,
  generateFinalPromptForFuelForServiceVehicle,
  generateFinalPromptForTOTScope2,
  generateFinalPromptForPurchaseEnergyLocation,
  generateFinalPromptForPurchaseEnergyMarket,
  generateFinalPromptForBusinessTravel,
  generateFinalPromptForCapitalGoods,
  generateFinalPromptForEmployeeCommuting,
  generateFinalPromptForFuelAndEnergyRelatedActivities,
  generateFinalPromptForTOTScope3,
  generateFinalPromptForUpstreamPurchasedGoodsAndServices,
  generateFinalPromptForUpstreamTransportationAndDistribution,
  generateFinalPromptForWasteGeneratedInOperations,
  generateFinalPromptForDownstreamTransportationAndDistribution,
  generateFinalPromptForEndOfLifeTreatmentOfSoldProducts,
  generateFinalPromptForProcessingOfSoldProducts,
  generateFinalPromptForUpstreamLeasedAssets,
  generateFinalPromptForUseOfSoldProducts,
  generateFinalPromptForBiogenicOutsideScopes,
  generateFinalPromptForDownstreamLeasedAssets,
  generateFinalPromptForFranchises,
  generateFinalPromptForInvestments,
  generateFinalPromptForScope1And2And3Combined,
  generateFinalPromptForScope1And2Combined,
  generateFinalPromptForTotalEmissionsLocationOrMarket,
} = require("../utils/StructuredData");

//Queues
const documentQueue = require("../queues/documentQueue");

//Supabase
const supabase = require("../config/supabase");
const pool = require("../config/connectSupabase");

//In-Memory Variable
let remainingRecords = [];
let processingPaused = false;
const MAX_RECORDS_PER_REQUEST = 1000;

/**
 * @description Upload Document Using Adobe
 * @route POST /api/document/upload
 * @access Public
 */
module.exports.uploadDocument = async (req, res) => {
  const { company_name } = req.body;
  const allowedTypes = ["application/pdf"];

  // Edge Case: Check if file is provided
  if (!req.file) {
    return res.status(400).json({ status: false, msg: "No Document provided" });
  }

  // Edge Case: Validate file type
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      status: false,
      msg: "Invalid file type. Only PDF is allowed.",
    });
  }

  try {
    let buffer = req.file.buffer;
    let filename = req.file.originalname;
    let fileSize = req.file.size;

    // Check Job Status
    const { data: statusData, error: statusError } = await supabase
      .from("logs")
      .select("*");
    if (statusError)
      throw new Error(`Error from supabase: ${statusError.message}`);
    if (statusData.length > 0) {
      if (statusData[0].status === "processing") {
        return res.status(404).json(statusData[0]);
      }
    }

    // Delete All Rows from logs
    await supabase.from("logs").delete().not("id", "is", null);

    // Insert Company Name into Supabase
    const { data, error } = await supabase
      .from("reports")
      .insert({ company_name })
      .select("*");
    if (error) throw new Error(`Error from supabase: ${error.message}`);

    // Ensure buffer is the correct type before writing to file
    if (!(buffer instanceof Buffer)) {
      console.warn("Buffer is not of type Buffer, converting...");
      buffer = Buffer.from(buffer);
    }

    // Prepare temporary path
    const tempPath = path.join(__dirname, "../temp");
    await prepareTempPath(tempPath);

    // Store the Document in temp
    const filePath = path.join(tempPath, filename);
    await writeFile(filePath, buffer);

    //Compress PDF if Needed
    if (fileSize > 15) {
      const compressedPDF = await CompressPDF(filename);
      if (!compressedPDF.status)
        throw new Error("Something went wrong while compressing");
    }

    // Add the document processing task to the queue
    const job = await documentQueue.add({
      company_name,
      documentId: data[0].id,
      filename: req.file.originalname,
      type: "adobe",
    });

    // Initial Job Status in Supabase
    const { error: logError } = await supabase.from("logs").insert({
      status: "processing",
      msg: "Job is still processing.",
      documentId: data[0].id,
      jobId: job.id,
      jobProcessed: "0%",
    });
    if (logError) throw new Error(`Error from supabase: ${logError.message}`);

    // Respond immediately to the client with job ID
    return res.status(202).json({
      status: "processing",
      jobId: job.id,
      documentId: data[0].id,
      msg: "Document is being processed, please check after 20 minutes.",
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
};

/**
 * @description Upload Document Using Llama Parse
 * @route POST /api/document/upload-llama
 * @access Public
 */
module.exports.uploadDocumentLlama = async (req, res) => {
  const { company_name } = req.body;
  const allowedTypes = ["application/pdf"];

  // Edge Case: Check if file is provided
  if (!req.file) {
    return res.status(400).json({ status: false, msg: "No Document provided" });
  }

  // Edge Case: Validate file type
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      status: false,
      msg: "Invalid file type. Only PDF is allowed.",
    });
  }

  try {
    let buffer = req.file.buffer;
    let filename = req.file.originalname;
    let fileSize = req.file.size;

    /**
     * CHECK JOB STATUS
     */
    // Check Job Status
    const { data: statusData, error: statusError } = await supabase
      .from("logs")
      .select("*");
    if (statusError)
      throw new Error(`Error from supabase: ${statusError.message}`);
    if (statusData.length > 0) {
      if (statusData[0].status === "ONGOING") {
        return res.status(404).json(statusData[0]);
      }
    }

    // Delete All Rows from logs
    await supabase.from("logs").delete().not("id", "is", null);

    /**
     * PREPARE AND COMPRESS FILE
     */
    // Ensure buffer is the correct type before writing to file
    if (!(buffer instanceof Buffer)) {
      console.warn("Buffer is not of type Buffer, converting...");
      buffer = Buffer.from(buffer);
    }

    // Prepare temporary path
    const tempPath = path.join(__dirname, "../temp");
    await prepareTempPath(tempPath);

    // Store the Document in temp
    const filePath = path.join(tempPath, filename);
    await writeFile(filePath, buffer);

    //Compress PDF if Needed
    if (fileSize > 15 * 1024 * 1024) {
      const compressedPDF = await CompressPDF(filename);
      if (!compressedPDF.status)
        throw new Error("Something went wrong while compressing");
    }

    /**
     * STORE INITIAL DATA TO SUPABASE
     */
    //Upload PDF to Supbase
    const uploadResponse = await uploadToSupabase(buffer, filename);
    if (!uploadResponse.status) {
      return res.status(500).json({
        status: false,
        msg: uploadResponse.error,
      });
    }

    // Insert Company Name and Source Link into Supabase
    const { data, error } = await supabase
      .from("reports")
      .insert([
        {
          company_name: company_name,
          source_1_link: uploadResponse.publicUrl,
        },
      ])
      .select("*");
    if (error) throw new Error(`Error from supabase: ${error.message}`);

    /**
     * JOB QUEUE AND JOB STATUS
     */
    // Add the document processing task to the queue
    const job = await documentQueue.add({
      company_name,
      documentId: data[0].id,
      filename: req.file.originalname,
      type: "llama",
    });

    // Initial Job Status in Supabase
    const { error: logError } = await supabase.from("logs").insert({
      status: "ONGOING",
      msg: "Job is still processing.",
      documentId: data[0].id,
      jobId: job.id,
      jobProcessed: "0%",
    });
    if (logError) throw new Error(`Error from supabase: ${logError.message}`);

    //Update Report Status
    await supabase
      .from("reports")
      .update({ status: "ONGOING" })
      .eq("id", data[0].id);

    // Respond immediately to the client with job ID
    return res.status(202).json({
      status: "processing",
      jobId: job.id,
      documentId: data[0].id,
      msg: "Document is being processed, please check after 20 minutes.",
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
};

/**
 * @description Upload Document Using Unstructured
 * @route POST /api/document/upload-unstructured
 * @access Public
 */
module.exports.uploadDocumentUnstructured = async (req, res) => {
  const { company_name } = req.body;
  const allowedTypes = ["application/pdf"];

  // Edge Case: Check if file is provided
  if (!req.file) {
    return res.status(400).json({ status: false, msg: "No Document provided" });
  }

  // Edge Case: Validate file type
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      status: false,
      msg: "Invalid file type. Only PDF is allowed.",
    });
  }

  try {
    let buffer = req.file.buffer;
    let filename = req.file.originalname;
    let fileSize = req.file.size;

    // Check Job Status
    const { data: statusData, error: statusError } = await supabase
      .from("logs")
      .select("*");
    if (statusError)
      throw new Error(`Error from supabase: ${statusError.message}`);
    if (statusData.length > 0) {
      if (statusData[0].status === "processing") {
        return res.status(404).json(statusData[0]);
      }
    }

    // Delete All Rows from logs
    await supabase.from("logs").delete().not("id", "is", null);

    // Insert Company Name into Supabase
    const { data, error } = await supabase
      .from("reports")
      .insert({ company_name })
      .select("*");
    if (error) throw new Error(`Error from supabase: ${error.message}`);

    // Ensure buffer is the correct type before writing to file
    if (!(buffer instanceof Buffer)) {
      console.warn("Buffer is not of type Buffer, converting...");
      buffer = Buffer.from(buffer);
    }

    // Prepare temporary path
    const tempPath = path.join(__dirname, "../temp");
    await prepareTempPath(tempPath);

    // Store the Document in temp
    const filePath = path.join(tempPath, filename);
    await writeFile(filePath, buffer);

    //Compress PDF if Needed
    if (fileSize > 15) {
      const compressedPDF = await CompressPDF(filename);
      if (!compressedPDF.status)
        throw new Error("Something went wrong while compressing");
    }

    // Add the document processing task to the queue
    const job = await documentQueue.add({
      company_name,
      documentId: data[0].id,
      filename: req.file.originalname,
      type: "unstructured",
    });

    // Initial Job Status in Supabase
    const { error: logError } = await supabase.from("logs").insert({
      status: "processing",
      msg: "Job is still processing.",
      documentId: data[0].id,
      jobId: job.id,
      jobProcessed: "0%",
    });
    if (logError) throw new Error(`Error from supabase: ${logError.message}`);

    // Respond immediately to the client with job ID
    return res.status(202).json({
      status: "processing",
      jobId: job.id,
      documentId: data[0].id,
      msg: "Document is being processed, please check after 20 minutes.",
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
};

/**
 * @description Store Structure Data
 * @route POST /api/document/store-structure-data/:id
 * @access Public
 */
module.exports.storeStructureData = async (req, res) => {
  const { id } = req.params;
  const { year } = req.body;
  const nearEmbeddingPrompts = [
    `Tonnes CO2e, Scope 1, Scope 2 market-based, Scope 3, greenhouse gas emissions, emissions data, carbon dioxide, environment, carbon, co2, Own cars and pool cars, Refrigerants, Direct greenhouse gas emissions, Electricity consumption, District heating, District cooling, Indirect greenhouse gas emissions, Total emissions, Emission offsets, Carbon offsetting, Net emissions, Intensity, Net lettable area, Capital goods, Energy and air emissions, Business trips, ${year}`,
    `TOT Scope 1, Scope 1,  ${year}`,
    `Fuel for service vehicle fleet, ${year}`,
    `Facility stationary combustion and refrigerants, ${year}`,
    `TOT Scope 2 (market based), Scope 2, Scope 2 market-based, ${year}`,
    `Purchased energy (location-based), ${year}`,
    `Purchased energy (market-based), ${year}`,
    `TOT Scope 3, Scope 3, ${year}`,
    `UPSTREAM Purchased goods and services, ${year}`,
    `Capital goods, ${year}`,
    `Fuel- and energy-related activities, ${year}`,
    `Upstream transportation and distribution, ${year}`,
    `Waste generated in operations, ${year}`,
    `Business travel, ${year}`,
    `Employee commuting, ${year}`,
    `Upstream leased assets, ${year}`,
    `Downstream transportation and distribution, ${year}`,
    `Processing of sold products, ${year}`,
    `Use of sold products, ${year}`,
    `End-of-life treatment of sold products, ${year}`,
    `Downstream leased assets, ${year}`,
    `Franchises, ${year}`,
    `Investments, ${year}`,
    `Scope 1+2 (combined reporting), Scope 1,  Scope 2 market-based,  ${year}`,
    `Scope 1+2+3 (combined reporting),  Scope 1, Scope 2 market-based, Scope 3, ${year}`,
    `Biogenic (outside of scopes), ${year}`,
    `Total emissions (scope 1+2+3) location or market, Scope 1, Scope 2 market-based, Scope 3, market-based, location-based ${year}`,
  ];

  const finalPrompts = [
    generateFinalPromptForScopesInfo,
    generateFinalPromptForTOTScope1,
    generateFinalPromptForFuelForServiceVehicle,
    generateFinalPromptForFacilityStationary,
    generateFinalPromptForTOTScope2,
    generateFinalPromptForPurchaseEnergyLocation,
    generateFinalPromptForPurchaseEnergyMarket,
    generateFinalPromptForTOTScope3,
    generateFinalPromptForUpstreamPurchasedGoodsAndServices,
    generateFinalPromptForCapitalGoods,
    generateFinalPromptForFuelAndEnergyRelatedActivities,
    generateFinalPromptForUpstreamTransportationAndDistribution,
    generateFinalPromptForWasteGeneratedInOperations,
    generateFinalPromptForBusinessTravel,
    generateFinalPromptForEmployeeCommuting,
    generateFinalPromptForUpstreamLeasedAssets,
    generateFinalPromptForDownstreamTransportationAndDistribution,
    generateFinalPromptForProcessingOfSoldProducts,
    generateFinalPromptForUseOfSoldProducts,
    generateFinalPromptForEndOfLifeTreatmentOfSoldProducts,
    generateFinalPromptForDownstreamLeasedAssets,
    generateFinalPromptForFranchises,
    generateFinalPromptForInvestments,
    generateFinalPromptForScope1And2Combined,
    generateFinalPromptForScope1And2And3Combined,
    generateFinalPromptForBiogenicOutsideScopes,
    generateFinalPromptForTotalEmissionsLocationOrMarket,
  ];

  try {
    // Get language Code
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        status: false,
        msg: `Error from supabase ${error.message}`,
      });
    }
    const languageCode = data.language_code;

    // Initialize combinedData object
    let combinedData = {};

    // Create an array of promises to run in parallel
    const promises = nearEmbeddingPrompts.map(
      async (nearEmbeddingPrompt, i) => {
        const finalPromptFunction = finalPrompts[i];

        // Translate if not English
        if (languageCode !== "en") {
          nearEmbeddingPrompt = await translatePrompt(
            nearEmbeddingPrompt,
            languageCode
          );
        }

        // Get Embedding To Find Nearest
        const nearEmbedding = await createEmbedding(nearEmbeddingPrompt);

        // Get the related data
        const result = await queryIndex(nearEmbedding, data.company_name);

        // Extract Text From Result
        let basePrompt = "";
        result.matches.forEach((e) => {
          basePrompt += e.metadata.text.toString() + "\n";
        });

        // Extract data using finalPrompt
        const { finalPrompt, column } = finalPromptFunction(basePrompt, year);

        const response = await openai(finalPrompt);
        const responseJSONData = parseResponseJSON(response, column);

        return responseJSONData;
      }
    );

    // Wait for all promises to resolve
    const results = await Promise.all(promises);

    // Merge all results into combinedData
    results.forEach((result) => {
      combinedData = { ...combinedData, ...result };
    });

    // Store the Structured Data in Supabase
    const { error: supabaseError } = await supabase
      .from("reports")
      .upsert([{ ...combinedData, id, year_of_emissions: year }], {
        onConflict: "id",
        set: { ...combinedData, year_of_emissions: year },
      });

    if (supabaseError) {
      console.log(supabaseError);
      return res.status(500).json({
        status: false,
        msg: `Error from supabase ${supabaseError.message}`,
      });
    }

    return res.status(200).json({ status: true, data: combinedData });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};

/**
 * @description Get Structure Data
 * @route POST /api/document/get-structure-data
 * @access Public
 */
module.exports.getStructureData = async (req, res) => {
  const { company_name, country_code, revenuetsek } = req.body;
  const search = company_name.toLowerCase();

  try {
    let query = supabase
      .from("reports")
      .select("*")
      .ilike("company_name", `%${search}%`);

    // Add the country_code filter if provided
    if (country_code && country_code !== "") {
      query = query.eq("country_code", country_code);
    }

    // Convert revenuetsek to a number before applying the lte filter
    const revenueNumber = Number(revenuetsek);
    if (!isNaN(revenueNumber) && revenuetsek !== "") {
      query = query.lte("revenuetsek", revenueNumber);
    }

    // Order by created_at in descending order
    query = query.order("created_at", { ascending: false });
    let { data, error } = await query;
    if (error) {
      return res
        .status(404)
        .json({ status: false, msg: `Error In Supabase ${error.message}` });
    }

    return res.status(200).json({ status: true, data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};

/**
 * @description Check Current Job Status
 * @route GET /api/document/status
 * @access Public
 */
module.exports.checkJobStatus = async (req, res) => {
  const { data } = await supabase.from("logs").select("*");
  if (data) {
    res.status(200).json(data[0]);
  } else {
    res
      .status(202)
      .json({ status: "ONGOING", msg: "Job is still processing." });
  }
};

/**
 * @description Import Document
 * @route POST /api/document/import
 * @access Public
 */
module.exports.importDocument = async (req, res) => {
  const file = req.file;
  const conflicts = [];
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  const allowedExtensions = [".xlsx", ".xls"];

  if (!file) {
    return res.status(400).json({ status: false, msg: "No Document provided" });
  }

  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (
    !allowedExtensions.includes(fileExtension) ||
    !allowedMimeTypes.includes(file.mimetype)
  ) {
    return res.status(400).json({
      status: false,
      msg: "Invalid file type. Please upload an Excel file.",
    });
  }

  try {
    const buffer = Buffer.from(file.buffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const databaseSheetName = workbook.SheetNames.includes("Database")
      ? "Database"
      : workbook.SheetNames[0];
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[databaseSheetName]);
    remainingRecords = sheet;

    await processRecords(remainingRecords, conflicts);

    if (conflicts.length > 0) {
      processingPaused = true;
      return res
        .status(409)
        .json({ status: false, msg: "Conflicts found", conflicts });
    }

    return res
      .status(200)
      .json({ status: true, msg: "Document Imported Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};

async function processRecords(records, conflicts) {
  processingPaused = false;
  while (records.length > 0 && !processingPaused) {
    const record = records.shift();
    const { company_name, year_of_emissions } = record;
    const { data: existingRecords, error } = await supabase
      .from("reports")
      .select("*")
      .eq("company_name", company_name)
      .eq("year_of_emissions", year_of_emissions);

    if (error) {
      throw new Error(`Error in Supabase: ${error.message}`);
    }

    if (existingRecords.length > 0) {
      conflicts.push({ existingRecords, newRecord: record });
      processingPaused = true;
      break;
    } else {
      const { error: insertError } = await supabase
        .from("reports")
        .insert(record);
      if (insertError) {
        throw new Error(`Error in Supabase: ${insertError.message}`);
      }
    }
  }
}

/**
 * @description Resolve Conflict
 * @route POST /api/document/resolve-conflict
 * @access Public
 */
module.exports.resolveConflicts = async (req, res) => {
  const { action, newRecord } = req.body;

  try {
    if (action === "override") {
      const { error } = await supabase.from("reports").insert(newRecord);
      if (error) {
        return res.status(500).json({ errors: error });
      }
    } else if (action === "skip") {
      // Simply skip, no action needed
    } else {
      return res.status(400).json({ status: false, msg: "Invalid action" });
    }

    const conflicts = [];
    await processRecords(remainingRecords, conflicts);

    if (conflicts.length > 0) {
      return res
        .status(409)
        .json({ status: false, msg: "Conflicts found", conflicts });
    }

    return res
      .status(200)
      .json({ status: true, msg: "Document Imported Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};
/**
 * @description Process Remaining Records
 * @route POST /api/document/import-remaining
 * @access Public
 */
module.exports.importRemainingRecords = async (req, res) => {
  const conflicts = [];
  try {
    await processRecords(remainingRecords, conflicts);
    if (conflicts.length > 0) {
      return res
        .status(409)
        .json({ status: false, msg: "Conflicts found", conflicts });
    }
    return res
      .status(200)
      .json({ status: true, msg: "Document Imported Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};

/**
 * @description Export Document
 * @route GET /api/document/export
 * @access Public
 */
module.exports.exportDocument = async (req, res) => {
  try {
    let allData = [];
    let page = 1;

    // Fetch data in batches until all records are fetched
    while (true) {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .range(page, page + MAX_RECORDS_PER_REQUEST - 1);

      if (error) {
        return res.status(502).json({
          status: false,
          msg: `Error in Supabase: ${error.message}`,
        });
      }

      if (!data || data.length === 0) break;

      allData.push(...data);
      page += MAX_RECORDS_PER_REQUEST;
    }

    const worksheet = xlsx.utils.json_to_sheet(allData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="exported_data.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    return res.status(200).send(buffer);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};

/**
 * @description Add Column
 * @route POST /api/document/add-column
 * @access Public
 */
module.exports.addColumn = async (req, res) => {
  const { columnName, columnType } = req.body;

  if (!columnName || !columnType) {
    return res
      .status(400)
      .json({ status: false, msg: "Missing required fields" });
  }

  try {
    const sql = `ALTER TABLE reports ADD COLUMN ${columnName} ${columnType} DEFAULT '-'`;
    await pool.query(sql);

    res.status(200).json({ status: true, msg: "Column added successfully" });
  } catch (error) {
    console.error("Error adding column:", error);
    return res.status(500).json({ errors: error });
  }
};
