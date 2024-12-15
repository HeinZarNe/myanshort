const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const shortid = require("shortid");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then((_) => console.log("Mongodb is connected"))
  .catch((err) => console.error(err));

const urlSchema = new mongoose.Schema({
  shortId: String,
  originalUrl: String,
});

const Url = mongoose.model("Url", urlSchema);

//POST
app.post("/shorten", async (req, res) => {
  const { originalUrl } = req.body;
  const shortId = shortid.generate();
  const newUrl = new Url({ shortId, originalUrl });

  await newUrl.save();
  res.json({ shortUrl: `${req.headers.host}/${shortId}` });
});

//Get

app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;
  const entry = await Url.findOne({ shortId });

  if (entry) {
    res.redirect(entry.originalUrl);
  } else {
    res.status(404).json({ message: "URL not found" });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
