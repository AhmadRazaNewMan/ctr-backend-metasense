const PDFServicesSdk = require("@adobe/pdfservices-node-sdk");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Configure ENV
dotenv.config();

const pdfClientId = process.env.PDF_SERVICES_CLIENT_ID;
const pdfClientSecret = process.env.PDF_SERVICES_CLIENT_SECRET;

if (!pdfClientId) throw Error("PDF_SERVICES_CLIENT_ID is empty");
if (!pdfClientSecret) throw Error("PDF_SERVICES_CLIENT_SECRET is empty");

module.exports.CompressPDF = async (fileName) => {
  const OUTPUT_PATH = path.join(__dirname, "../temp");
  const INPUT_PATH = path.join(OUTPUT_PATH, fileName);

  const MAX_SIZE_MB = 15;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  try {
    // Initial setup, create credentials instance
    const credentials =
      PDFServicesSdk.Credentials.servicePrincipalCredentialsBuilder()
        .withClientId(pdfClientId)
        .withClientSecret(pdfClientSecret)
        .build();

    // Repeat compression until file size is under the limit
    let currentFilePath = INPUT_PATH;
    let currentFileSize = fs.statSync(INPUT_PATH).size;

    while (currentFileSize > MAX_SIZE_BYTES) {
      // Creates an execution context using credentials
      const executionContext =
        PDFServicesSdk.ExecutionContext.create(credentials);

      // Creates a new compress PDF operation instance
      const compressPDF = PDFServicesSdk.CompressPDF.Operation.createNew();

      // Set the input file from the current file path
      const inputFile = PDFServicesSdk.FileRef.createFromLocalFile(
        currentFilePath,
        PDFServicesSdk.CompressPDF.SupportedSourceFormat.pdf
      );

      compressPDF.setInput(inputFile);

      console.log(
        `Executing compression job on file size: ${currentFileSize} bytes...`
      );

      // Execute the operation and save the result to a temporary file
      const tempFilePath = path.join(OUTPUT_PATH, `temp_${fileName}`);

      // Ensure temp file does not exist
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      try {
        const compressResult = await compressPDF.execute(executionContext);
        await compressResult.saveAsFile(tempFilePath);
      } catch (executionError) {
        console.error("Error during compression execution:", executionError);
        throw executionError;
      }

      // Check if the temporary file was created
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Temporary file was not created: ${tempFilePath}`);
      }

      // Check the size of the compressed file
      currentFileSize = fs.statSync(tempFilePath).size;

      if (currentFileSize <= MAX_SIZE_BYTES) {
        console.log(
          `Compressed file is within size limit: ${currentFileSize} bytes`
        );

        // Remove the original or previous file
        fs.unlinkSync(currentFilePath);

        // Rename the temporary compressed file to the original file name
        fs.renameSync(tempFilePath, INPUT_PATH);

        console.log(`Compressed file saved as: ${INPUT_PATH}`);
        break;
      } else {
        console.log(
          `Compressed file is still too large: ${currentFileSize} bytes. Recompressing...`
        );

        // Remove the previous version of the file
        fs.unlinkSync(currentFilePath);

        // Move the newly compressed file to be the input for the next iteration
        fs.renameSync(tempFilePath, currentFilePath);
      }
    }

    return { status: true };
  } catch (err) {
    const isSDKErrorAvailable =
      typeof PDFServicesSdk.Error.SDKError !== "undefined";
    const isServiceUsageErrorAvailable =
      typeof PDFServicesSdk.Error.ServiceUsageError !== "undefined";
    const isServiceApiErrorAvailable =
      typeof PDFServicesSdk.Error.ServiceApiError !== "undefined";

    if (
      (isSDKErrorAvailable && err instanceof PDFServicesSdk.Error.SDKError) ||
      (isServiceUsageErrorAvailable &&
        err instanceof PDFServicesSdk.Error.ServiceUsageError) ||
      (isServiceApiErrorAvailable &&
        err instanceof PDFServicesSdk.Error.ServiceApiError)
    ) {
      console.error("Exception encountered while executing operation", err);
    } else {
      console.error("Exception encountered while executing operation", err);
    }
    throw err;
  }
};
