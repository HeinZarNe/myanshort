require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const shortid = require("shortid");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

const Url = mongoose.model("Url", urlSchema);

app.get("/", async (req, res) => {
  res.json("Hello");
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
