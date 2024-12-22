const express = require("express");
const urlController = require("../controllers/urlController");
const ensureAuthenticated = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/shorten", ensureAuthenticated, urlController.shortenUrl);
router.get("/:shortId", ensureAuthenticated, urlController.redirectUrl);
router.get("/", ensureAuthenticated, urlController.getAllUrls);
module.exports = router;
