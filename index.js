require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const shortid = require("shortid");
const validator = require("validator");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb is connected"))
  .catch((err) => console.error("Mongodb connection error:", err));

const urlSchema = new mongoose.Schema({
  shortId: { type: String },
  originalUrl: { type: String, unique: true },
  clicks: { type: Number, default: 0 },
});

const Url = mongoose.model("Url", urlSchema);

app.get("/", async (req, res) => {
  res.json("Hello");
});

// POST
app.post("/shorten", async (req, res) => {
  const { originalUrl } = req.body;
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
app.get("/:shortId", async (req, res) => {
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
