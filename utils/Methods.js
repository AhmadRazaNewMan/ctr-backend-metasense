//NPM Packages
const LanguageDetect = require("languagedetect");
const lngDetector = new LanguageDetect();
const fs = require("fs");
const path = require("path");

//Supbase
const supabase = require("../config/supabase");

/**
 * @description Takes Text as Input as returns Language Code
 * @type Funtion
 * @input text- String
 * @returns Language Code - String
 */
module.exports.detectLanguage = (text) => {
  lngDetector.setLanguageType("iso2");
  const language = lngDetector.detect(text.toString(), 1);
  return language[0][0].toString();
};

/**
 * @description Return Current Date in YYYY/MM/DD Format
 * @type Funtion
 * @input
 * @returns Current Date - String
 */
module.exports.getCurrentDate = () => {
  // Create a new Date object
  const currentDate = new Date();

  // Get the current year, month, and day
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  // Format the date as a string
  const formattedDate = `${year}-${month}-${day}`;

  return formattedDate;
};

/**
 * @description Returns UINT-8 Random ID
 * @type Funtion
 * @input
 * @returns Random ID - Number
 */
module.exports.getRandomIds = () => {
  return Math.floor(Math.random() * 256) - 128;
};

/**
 * @description Empties Parent and All Sub Directory
 * @type Funtion
 * @input Directory Path
 * @returns
 */
module.exports.emptyFolder = (folderPath) => {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);

    // Check if the file or subfolder is a directory
    if (fs.statSync(filePath).isDirectory())
      module.exports.emptyFolder(filePath);
    else fs.unlinkSync(filePath);
  }

  fs.rmdirSync(folderPath);
};

/**
 * @description Parse String into Valid JSON
 * @type Funtion
 * @input response - String
 * @returns JSON - JSON
 */
module.exports.parseResponseJSON = (response, column) => {
  let attempts = 0;
  const maxAttempts = 5;

  const tryParse = (responseString) => {
    try {
      const responseJSONString = responseString.replace(/```json\n|```/g, "");
      const responseJSONData = JSON.parse(responseJSONString);
      return responseJSONData;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error("Max attempts reached. Returning default JSON.");
        return column;
      } else {
        console.error(`Error parsing JSON (Attempt ${attempts}):`, error);
        console.log("Retrying JSON parsing...");
        return tryParse(responseString);
      }
    }
  };

  return tryParse(response);
};

/**
 * @description Takes milliseconds and Sets a Timeout
 * @type Funtion
 * @input ms - milliseconds
 * @returns Promise
 */
module.exports.delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @description Prepare Temp Folder
 * @type Funtion
 * @input Directory Path
 * @returns
 */
module.exports.prepareTempPath = async (tempPath) => {
  try {
    if (fs.existsSync(tempPath)) {
      console.log(`Emptying temp folder: ${tempPath}`);
      module.exports.emptyFolder(tempPath);
    }
    console.log(`Creating temp folder: ${tempPath}`);
    fs.mkdirSync(tempPath);
  } catch (err) {
    console.error(`Failed to prepare temp path (${tempPath}):`, err);
    throw new Error(
      `Failed to prepare temp path (${tempPath}): ${err.message}`
    );
  }
};

/**
 * @description Store/Write File to the given path
 * @type Funtion
 * @input FilePath, Buffer
 * @returns
 */
module.exports.writeFile = async (filePath, buffer) => {
  try {
    console.log(`Writing file to ${filePath}...`);
    await fs.promises.writeFile(filePath, buffer);
    console.log(`File written to ${filePath}`);
  } catch (err) {
    console.error(`Failed to write file to ${filePath}:`, err);
    throw new Error(`Failed to write file (${filePath}): ${err.message}`);
  }
};

/**
 * @description Update Job Status In Supabase
 * @type Funtion
 * @input JobId, Percentage
 * @returns
 */
module.exports.updateJobStatus = async (jobId, documentId, percentage) => {
  await supabase
    .from("logs")
    .update({ status: "ONGOING", jobProcessed: percentage })
    .eq("jobId", jobId);

  //Update Report Status
  await supabase
    .from("reports")
    .update({ status: "ONGOING" })
    .eq("id", documentId);
};

/**
 * @description Update Job Error Status In Supabase
 * @type Funtion
 * @input JobId, msg, errorCode
 * @returns
 */
module.exports.updateJobErrorStatus = async (
  jobId,
  documentId,
  msg,
  errorCode
) => {
  await supabase
    .from("logs")
    .update({
      status: "ERROR",
      msg: `${msg} -- ${errorCode}`,
      jobId: jobId,
    })
    .eq("jobId", jobId);

  //Update Report Status
  await supabase
    .from("reports")
    .update({ status: "ERROR" })
    .eq("id", documentId);
};

/**
 * @description Upload to Supabase
 * @type Funtion
 * @input buffer, filename
 * @returns URL
 */
module.exports.uploadToSupabase = async (buffer, filename) => {
  const filePath = `pdfs/${Date.now()}-${filename}`;
  try {
    //Upload File
    const { data: uploadData, error } = await supabase.storage
      .from("CTI")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
      });
    if (error) {
      console.error("Error uploading file:", error.message);
      return { status: false, error: error.message };
    }
    console.log({ uploadData });

    //Get File URL
    const { data, error: urlError } = supabase.storage
      .from("CTI")
      .getPublicUrl(filePath);
    if (urlError) {
      console.error("Error generating public URL:", urlError.message);
      return { status: false, error: urlError.message };
    }

    console.log("File uploaded successfully:", data.publicUrl);
    return { status: true, publicUrl: data.publicUrl };
  } catch (error) {
    console.error("Error in uploadToSupabase:", error.message);
    return { status: false, error: error.message };
  }
};
