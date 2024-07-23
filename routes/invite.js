// NPM
const router = require("express").Router();

//Controller
const { acceptInvite } = require("../controllers/invite");

// Routes
router.route("/accept-invite").get(acceptInvite);

module.exports = router;
