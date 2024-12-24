// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const dbConnect = require("./config/db.js");
const passportConfig = require("./config/passport.js");
const authRoutes = require("./routes/authRoutes.js");
const urlRoutes = require("./routes/urlRoutes.js");
const userRoutes = require("./routes/userRoutes.js");

const app = express();

// Database Connection
dbConnect();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);
app.use("/api/users", userRoutes);

module.exports = app;