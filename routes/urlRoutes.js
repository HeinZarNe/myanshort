const express = require("express");
const urlController = require("../controllers/urlController");
const ensureAuthenticated = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/shorten", urlController.shortenUrl);
router.get("/:shortId", urlController.redirectUrl);
router.delete("/:shortId", ensureAuthenticated, urlController.deleteUrl);
router.get("/", ensureAuthenticated, urlController.getAllUrls);
module.exports = router;
