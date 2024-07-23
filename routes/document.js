// NPM
const router = require("express").Router();
const multer = require("multer");

// Controllers
const {
  uploadDocument,
  storeStructureData,
  getStructureData,
  checkJobStatus,
  uploadDocumentLlama,
  uploadDocumentUnstructured,
  importDocument,
  exportDocument,
  resolveConflicts,
  importRemainingRecords,
  addColumn,
} = require("../controllers/document");

// Multer
const storage = multer.memoryStorage();
const uploadDoc = multer({ storage: storage });

// Routes
router.route("/upload").post(uploadDoc.single("document"), uploadDocument);
router.route("/upload-llama").post(uploadDoc.single("document"), uploadDocumentLlama,(req,res));
router.route("/upload-unstructured").post(uploadDoc.single("document"), uploadDocumentUnstructured);
router.route("/store-structured-data/:id").post(storeStructureData);
router.route("/get-structured-data").post(getStructureData);
router.route("/status").get(checkJobStatus);
router.route('/import').post(uploadDoc.single("document"), importDocument)
router.route('/resolve-conflict').post(resolveConflicts)
router.route("/import-remaining").post(importRemainingRecords)
router.route('/export').get(exportDocument)
router.route("/add-column").post(addColumn)

module.exports = router;
