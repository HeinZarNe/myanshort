const express = require("express");
const authController = require("../controllers/authController");
const passport = require("passport");
const router = express.Router();

router.get("/google", authController.googleLogin);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  authController.googleCallback
);

router.post("/register", authController.register);

router.get("/logout", authController.logout);
router.get("/verify-email", authController.verify_email);
module.exports = router;
