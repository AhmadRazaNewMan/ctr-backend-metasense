const router = require("express").Router();

//Paths
const document = require("./document");
const invite = require("./invite");

//Routes
router.use("/document", document);
router.use("/invite", invite);

module.exports = router;
