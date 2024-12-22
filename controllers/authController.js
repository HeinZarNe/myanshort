const passport = require("passport");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendVerificationEmail = (user, req, res) => {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  const url = `http://localhost:3000/api/auth/verify-email?token=${token}`;
  transporter.sendMail(
    {
      to: user.email,
      subject: "Verify your email",
      html: `Click <a href="${url}">here</a> to verify your email.`,
    },
    (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
      } else {
        console.log("Email sent: " + info.response);
      }
    }
  );
};

exports.googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res) => {
  res.redirect(
    `http://localhost:5173/profile?user=${encodeURIComponent(
      JSON.stringify(req.user)
    )}`
  );
};

exports.register = async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    email,
    password: hashedPassword,
    isVerified: false,
  });
  try {
    await newUser.save();
    sendVerificationEmail(newUser, req, res);
    res.status(201).json({
      message:
        "User is registered successfully. Please check your email to verify your account.",
    });
  } catch (err) {
    if (err.code === 11000) {
      console.error(err);
      res.status(409).json({ message: "Email already exists" });
    } else {
      console.error("Error registering user:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

exports.verify_email = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(400).send("Invalid token");
    }

    const entry = await User.findByIdAndUpdate(
      { _id: decoded.userId },
      { isVerified: true }
    );
    if (!entry) {
      return res.status(404).send("User not found");
    }

    res.redirect(process.env.FRONTEND_API);
  } catch (err) {
    console.error(err);
    res.status(400).send("Invalid or expired token");
  }
};

exports.logout = (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
};
