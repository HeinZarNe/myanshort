require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const shortid = require("shortid");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const session = require("express-session");
const nodemailer = require("nodemailer");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:3000/auth/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser((user, done) => done(null, user));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb is connected"))
  .catch((err) => console.error("Mongodb connection error:", err));

const urlSchema = new mongoose.Schema(
  {
    shortId: { type: String },
    originalUrl: { type: String, unique: true },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt" } }
);

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    username: { type: String, unique: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt" } }
);

const User = mongoose.model("User", userSchema);
const Url = mongoose.model("Url", urlSchema);

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendVerificationEmail = (user, req, res) => {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  const url = `http://${req.header.host}/verify-email?token=${token}`;
  transporter.sendMail({
    to: user.email,
    subject: "Verify your email",
    html: `Click <a href="${url}">here</a> to verify your email.`,
  });
};

app.post("/api/register", async (req, res) => {
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
});

app.post("/api/login", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && bcrypt.compare(password, user.password)) {
      if (!user.isVerified) {
        return res
          .status(401)
          .json({ message: "Please verify your email before logging in." });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ message: "Login successful" });
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) =>
    res.redirect(
      `http://localhost:5173/profile?user=${encodeURIComponent(
        JSON.stringify(req.user)
      )}`
    )
);

app.get("/api/profile", ensureAuthenticated, (req, res) => {
  res.json({ message: `Welcome ${req.user.displayName}` });
});

app.get("/logout", (req, res) => {
  req.logOut(() => res.redirect("/"));
});

app.get("/api/click_count/:shortId", async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.findOne({ shortId });
    if (entry) {
      res.json({ clicks: entry.clicks });
    } else {
      res.status(404).json({ message: "URL not found" });
    }
  } catch (err) {
    console.error("Error finding URL:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/api/adlink", async (req, res) => {
  try {
    const entry = await Url.find({}).sort({ _id: -1 });
    res.json(entry);
  } catch (err) {
    console.error("Error getting URL:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// POST
app.post("/api/shorten", async (req, res) => {
  let { originalUrl } = req.body;

  // Ensure originalUrl starts with http or https
  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = `http://${originalUrl}`;
  }

  if (!validator.isURL(originalUrl)) {
    console.error("Invalid Url");
    return res.status(400).json({ message: "Invalid URL" });
  }

  const shortId = shortid.generate();
  const newUrl = new Url({ shortId, originalUrl });
  try {
    await newUrl.save();
    res.json({ shortId });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ message: "Url already exists" });
    } else {
      console.error("Error saving URL:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

// GET
app.get("/api/:shortId", async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.findOne({ shortId });
    if (entry) {
      entry.clicks += 1;
      await entry.save();
      res.redirect(entry.originalUrl);
    } else {
      res.status(404).json({ message: "URL not found" });
    }
  } catch (err) {
    console.error("Error finding URL:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/api/adLink/:shortId", async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.deleteOne({ shortId });
    if (entry) {
      res.status(202).json({ message: "Deleted successfully" });
    } else {
      res.status(404).json({ message: "URL not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
