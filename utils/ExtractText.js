const PDFServicesSdk = require("@adobe/pdfservices-node-sdk");
const path = require("path");
const AdmZip = require("adm-zip");
const fs = require("fs");
const { PdfCounter } = require("page-count");

//Configure ENV
const dotenv = require("dotenv");
dotenv.config();

const pdfClientId = process.env.PDF_SERVICES_CLIENT_ID;
const pdfClientSecret = process.env.PDF_SERVICES_CLIENT_SECRET;

if (!pdfClientId) throw Error("PDF_SERVICES_CLIENT_ID is empty");
if (!pdfClientSecret) throw Error("PDF_SERVICES_CLIENT_SECRET is empty");

/**
 * @description Splits The Document into Chucks and Uses PDFServicesSdk to Extract Text and Tables
 * @type Funtion
 * @input filename - String, jobId - String
 * @returns Extracted Data in temp Directory
 */
module.exports.splitAndExtractText = async (fileName) => {
  const OUTPUT_PATH = path.join(__dirname, "../temp");
  const INPUT_PATH = path.join(OUTPUT_PATH, fileName);

  /*
  *****
  Credentials
  *****
  */
  const credentials =
    PDFServicesSdk.Credentials.servicePrincipalCredentialsBuilder()
      .withClientId(pdfClientId)
      .withClientSecret(pdfClientSecret)
      .build();

  // Create an ExecutionContext using credentials
  const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

  /*
  *****
  Number of Pages in PDF
  *****
  */
  const pdfBuffer = fs.readFileSync(INPUT_PATH);
  let pageCount;
  try {
    pageCount = await PdfCounter.count(pdfBuffer);
  } catch (error) {
    console.error("Error counting pages:", error);
    throw error;
  }

  /*
  *****
  Split The PDF
  *****
  */
  // Create a new operation instance.
  const numberOfChunks = pageCount < 4 ? 1 : 4;
  const splitPDFOperation = PDFServicesSdk.SplitPDF.Operation.createNew();
  const splitInput = PDFServicesSdk.FileRef.createFromLocalFile(
    INPUT_PATH,
    PDFServicesSdk.SplitPDF.SupportedSourceFormat.pdf
  );

  // Set operation input from a source file.
  splitPDFOperation.setInput(splitInput);

  // Set the number of documents to split the input PDF file into.
  splitPDFOperation.setFileCount(numberOfChunks);

  //Execute Split Operation
  let result;
  try {
    result = await splitPDFOperation.execute(executionContext);
    const saveFilesPromises = result.map(async (splitPDF, i) => {
      await splitPDF.saveAsFile(path.join(OUTPUT_PATH, `split_${i}.pdf`));
    });
    await Promise.all(saveFilesPromises);
  } catch (err) {
    console.log("Exception encountered while splitting", err);

    if (
      err instanceof PDFServicesSdk.Error.ServiceApiError ||
      err instanceof PDFServicesSdk.Error.ServiceUsageError
    ) {
      console.log("Service error encountered while splitting", err);
      throw err;
    } else {
      console.log("Exception encountered while splitting", err);
      throw err;
    }
  }

  /*
  *****
  Extract Text From PDF
  *****
  */

  // Build extractPDF options
  const options =
    new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
      .addElementsToExtract(
        PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT,
        PDFServicesSdk.ExtractPDF.options.ExtractElementType.TABLES
      )
      .addElementsToExtractRenditions(
        PDFServicesSdk.ExtractPDF.options.ExtractRenditionsElementType.TABLES
      )
      .addTableStructureFormat(
        PDFServicesSdk.ExtractPDF.options.TableStructureType.CSV
      )
      .build();

  for (let i = 0; i < result.length; i++) {
    // Create a new operation instance.
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();
    const extractionInput = PDFServicesSdk.FileRef.createFromLocalFile(
      path.join(OUTPUT_PATH, `split_${i}.pdf`),
      PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
    );

    extractPDFOperation.setInput(extractionInput);
    extractPDFOperation.setOptions(options);

    // Execute extraction operation
    try {
      const extractResult = await extractPDFOperation.execute(executionContext);
      await extractResult.saveAsFile(path.join(OUTPUT_PATH, `OUTPUT_${i}.zip`));
      const zip = new AdmZip(path.join(OUTPUT_PATH, `OUTPUT_${i}.zip`));
      const OUTPUT_DIR = path.join(OUTPUT_PATH, `OUTPUT_${i}`);
      if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

      zip.extractAllTo(OUTPUT_DIR, true);
      console.log(`Part ${i + 1} extraction from PDF completed.`);
    } catch (error) {
      console.log("Error in extract text function", error);
      throw error;
    }
  }

  return { status: true };
};
