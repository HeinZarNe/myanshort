const express = require("express");
const urlController = require("../controllers/urlController");
const ensureAuthenticated = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/public/shorten", urlController.publicShortenUrl);
router.post("/shorten", ensureAuthenticated, urlController.privateShortenUrl);
router.get("/:shortId", urlController.redirectUrl);
router.delete("/:shortId", ensureAuthenticated, urlController.deleteUrl);
router.post("/modify/:shortId", ensureAuthenticated, urlController.modifyUrl);
router.get("/", ensureAuthenticated, urlController.getAllUrls);
router.get("/detail/:id", ensureAuthenticated, urlController.getUrlDetail);
module.exports = router;
