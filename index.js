const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const shortid = require("shortid");
const validator = require("validator");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((_) => console.log("Mongodb is connected"))
  .catch((err) => console.error(err));

const urlSchema = new mongoose.Schema({
  shortId: { type: String },
  originalUrl: { type: String, unique: true },
});

const Url = mongoose.model("Url", urlSchema);

//POST
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
    res.json({ shortUrl: `${req.headers.host}/${shortId}` });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ message: "Url already exist" });
    } else {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

//Get
app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.findOne({ shortId });
    if (entry) {
      res.redirect(entry.originalUrl);
    } else {
      res.status(404).json({ message: "URL not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
