const express = require("express");
const authController = require("../controllers/authController");
const passport = require("passport");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/auth/google/handle-error",
  }),
  authController.googleCallback
);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.get("/google/handle-error", authController.googleHandleError);
router.get("/request-email-verify", authController.requestNewVerificationEmail);
router.get("/logout", authController.logout);
router.get("/verify-email", authController.verify_email);
module.exports = router;
